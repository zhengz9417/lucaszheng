window.App = window.App || {};
const { auth, db, firebase, ensureAuth, roomRefs } = window.App.firebase;
const { TARGETS, rnd, makeCustomDeck, isMatch, nextAliveFrom, toast } = window.App.utils;
const { t } = window.App;

let ROOM_ID = null, isHost = false, uid = null;
let me = { uid:null, name:"" };
window.App.session = { get ROOM_ID(){return ROOM_ID;}, isHost:()=>isHost, get uid(){return uid;}, me };

let H = null;              // Host 权威状态
let L=null, S=null;        // lobby/state 镜像
let unsubActions=null, unsubLobby=null, unsubState=null, unsubEvents=null, unsubMyHand=null;
let processedEvents=new Set();
let myHand=[], myHandHash=""; const selectedIndices=new Set();
let lastReveal=null, lastTurnUid=null;

function emitEvent(type, payload){
  const { events } = roomRefs(ROOM_ID);
  return events.add({ type, payload, ts: firebase.firestore.FieldValue.serverTimestamp() });
}
async function handsSetOne(uidX, hand){ const { hands } = roomRefs(ROOM_ID); await hands.doc(uidX).set({ ownerUid:uidX, hand }); }

/* ---------- 进入/加入 ---------- */
async function hostInit(roomId, name){
  isHost = true; ROOM_ID = roomId; me.name = name;
  const user = await ensureAuth(); uid = user.uid; me.uid = uid;

  H = {
    settings:{ seats:4, startHand:5 },
    players: new Array(4).fill(null),
    roundNo:0, target:null, turn:0,
    pot:[], awaitingReveal:false, challengerId:null,
  };
  H.players[0] = { uid, name, alive:true, rolls:[], rollMap:{}, hand:[] };

  const { lobby } = roomRefs(ROOM_ID);
  await lobby.set({
    hostUid: uid,
    settings: H.settings,
    seats: H.players.map(p=> p ? {uid:p.uid, name:p.name, alive:p.alive, rolls:p.rolls} : null),
    canStart: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });

  attachCommonListeners();
  attachHostActionListener();
  window.App.ui.enterLobbyUI();
  document.getElementById("roomShow").textContent = ROOM_ID;
  document.getElementById("roleShow").textContent = t('roleHost');
  document.getElementById("hostPanel").classList.remove('hidden');
}

async function guestJoin(roomId, name){
  isHost = false; ROOM_ID = roomId; me.name = name;
  const user = await ensureAuth(); uid = user.uid; me.uid = uid;
  attachCommonListeners();
  window.App.ui.enterLobbyUI();
  document.getElementById("roomShow").textContent = ROOM_ID;
  document.getElementById("roleShow").textContent = t('roleGuest');
  document.getElementById("hostPanel").classList.add('hidden');
}

/* ---------- 写入 ---------- */
async function writeLobby(){
  const { lobby } = roomRefs(ROOM_ID);
  const canStart = H.players.filter(p=>p && p.alive).length >= 2;
  await lobby.set({
    hostUid: uid,
    settings: H.settings,
    seats: H.players.map(p=> p ? {uid:p.uid, name:p.name, alive:p.alive, rolls:p.rolls} : null),
    canStart
  }, { merge:true });
}
async function writeState(withWinner=false){
  const { state } = roomRefs(ROOM_ID);
  const winner = withWinner ? (H.players.find(p=>p && p.alive) || null) : null;
  const data = {
    roundNo: H.roundNo, target: H.target, turn: H.turn,
    awaitingReveal: H.awaitingReveal,
    lastClaim: H.pot.length? { by:H.pot[H.pot.length-1].by, count:H.pot[H.pot.length-1].cards.length } : null,
    pot: H.pot.map(b=>({ by: b.by, count: b.cards.length })),
    players: H.players.map(p=> p ? {uid:p.uid,name:p.name,alive:p.alive, handCount:p.hand.length, rolls:p.rolls} : null),
    winner: winner ? {uid:winner.uid, name:winner.name} : null,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
  await state.set(data);
}
async function sendHands(){
  const { hands } = roomRefs(ROOM_ID);
  for (const p of H.players){ if (!p) continue; await hands.doc(p.uid).set({ ownerUid:p.uid, hand:p.hand }); }
}

/* ---------- 游戏操作 ---------- */
async function hostApplySettings(){
  const newSeats = Math.max(2, Math.min(4, Number(document.getElementById("seatMax").value||4)));
  const startHand = Number(document.getElementById("startHand").value||5);
  const oldSeats = H.players.length;
  let arr = new Array(newSeats).fill(null);
  for (let i=0; i<Math.min(oldSeats, newSeats); i++) arr[i] = H.players[i] || null;
  if (!arr[0] || arr[0].uid !== uid){
    const idx = (H.players||[]).findIndex(p=>p && p.uid===uid);
    const hostObj = idx>=0 ? H.players[idx] : { uid, name: me.name, alive:true, rolls:[], rollMap:{}, hand:[] };
    if (arr[0] && arr[0].uid !== uid){
      const firstEmpty = arr.findIndex(x=>x===null);
      if (firstEmpty >= 1) arr[firstEmpty] = arr[0];
    }
    arr[0] = hostObj;
  }
  H.players = arr;
  H.settings = { seats: newSeats, startHand };
  await writeLobby();
}

async function hostStart(){
  const seated = H.players.filter(p=>p && p.alive);
  if (seated.length < 2){ toast(t('need2p')); return; }
  const deck = makeCustomDeck();
  if (seated.length * H.settings.startHand > deck.length){ toast(t('notEnough')); return; }

  for (const p of H.players){
    if (p && p.alive){ p.hand = deck.splice(0, H.settings.startHand); p.sel = new Set(); }
    else if (p){ p.hand = []; }
  }
  H.roundNo = (H.roundNo||0) + 1;
  H.target = TARGETS[rnd(TARGETS.length)];
  H.turn = H.players.findIndex(p=>p && p.alive);
  H.pot = []; H.awaitingReveal=false; H.challengerId=null;

  await sendHands(); await writeState();
  window.App.ui.showSmoke();
}
async function hostRestart(){
  H.roundNo = 0; H.pot=[]; H.awaitingReveal=false; H.challengerId=null;
  H.players.forEach(p=>{ if(p){ p.alive=true; p.rolls=[]; p.rollMap={}; p.hand=[]; }});
  await sendHands(); await writeLobby(); await writeState();
}
async function hostTakeSeat(seat, _uid, name){
  if (seat<0 || seat>=H.players.length) return;
  if (H.players[seat]) return;
  if (H.players.findIndex(p=>p && p.uid===_uid)>=0) return;
  H.players[seat] = { uid:_uid, name, alive:true, rolls:[], rollMap:{}, hand:[] };
  await writeLobby();
}
async function hostPlay(_uid, indices){
  const seat = H.players.findIndex(p=>p && p.uid===_uid);
  if (seat !== H.turn) return;
  const p = H.players[seat]; if (!p || !p.alive) return;
  if (!Array.isArray(indices) || indices.length===0) return;
  const sorted = [...indices].sort((a,b)=>b-a);
  const cards=[]; for (const i of sorted){ if (i<0 || i>=p.hand.length) return; cards.push(p.hand.splice(i,1)[0]); }
  H.pot.push({by:p.uid, cards, declared:H.target});
  H.awaitingReveal=false; H.challengerId=null;
  H.turn = nextAliveFrom(H, H.turn);
  await handsSetOne(p.uid, p.hand); await writeState();
}
async function hostLiar(_uid){ H.challengerId = _uid; H.awaitingReveal = true; lastReveal=null; await writeState(); }

const DICE_TURNS = 14, DICE_BASE = 70, DICE_INC = 35, DICE_HOLD = 1000;
function diceAnimMs(){ return (DICE_TURNS+1)*DICE_BASE + (DICE_TURNS*(DICE_TURNS+1)/2)*DICE_INC + DICE_HOLD; }

async function hostReveal(){
  if (!H.awaitingReveal || H.pot.length===0) return;
  const last = H.pot[H.pot.length-1];
  lastReveal = last.cards.map(c=>({...c}));
  await emitEvent("REVEAL_VIEW", { cards:last.cards.map(c=>({...c})) });

  setTimeout(async ()=>{
    const truthful = last.cards.every(c=>isMatch(c, H.target));
    const loserId  = truthful ? H.challengerId : last.by;
    const winnerId = truthful ? last.by : H.challengerId;
    const loserSeat  = H.players.findIndex(p=>p && p.uid===loserId);
    const winnerSeat = H.players.findIndex(p=>p && p.uid===winnerId);
    if (loserSeat<0) return;

    const P = H.players[loserSeat];
    const roll = 1 + rnd(6);

    await emitEvent("DICE_ANIM", { who:P.name, value:roll });

    setTimeout(async ()=>{
      P.rolls.push(roll); P.rollMap[roll]=(P.rollMap[roll]||0)+1;
      let dieNow = (roll===6) || (P.rollMap[roll]>=2);
      if (dieNow){ P.alive=false; P.hand=[]; await handsSetOne(P.uid, P.hand); }

      await emitEvent("DICE_RESULT", { who:P.name, uid:P.uid, value:roll, died:dieNow });

      const startIndex = (winnerSeat>=0 && H.players[winnerSeat]?.alive) ? winnerSeat : nextAliveFrom(H, loserSeat);
      setTimeout(async ()=>{ await redealFrom(startIndex); }, 1200);
    }, diceAnimMs());
  }, 3000);
}
async function redealFrom(startIndex){
  const alive = H.players.filter(p=>p && p.alive);
  if (alive.length<=1){ await writeState(true); return; }
  const deck = makeCustomDeck();
  const need = alive.length * H.settings.startHand;
  if (need > deck.length){ H.settings.startHand = Math.max(1, Math.floor(deck.length / alive.length)); }
  for (const p of H.players){ if (p && p.alive) p.hand = deck.splice(0,H.settings.startHand); else if (p) p.hand=[]; }
  H.pot=[]; H.target = TARGETS[rnd(TARGETS.length)];
  H.roundNo = (H.roundNo||0)+1; H.turn = startIndex;
  H.awaitingReveal=false; H.challengerId=null; lastReveal=null; lastTurnUid=null;
  await sendHands(); await writeLobby(); await writeState(); window.App.ui.showSmoke();
}
async function hostBackToLobbyReset(){
  H.roundNo = 0; H.pot=[]; H.awaitingReveal=false; H.challengerId=null;
  H.target=null; H.turn=0;
  H.players.forEach(p=>{ if(p){ p.alive=true; p.rolls=[]; p.rollMap={}; p.hand=[]; }});
  await sendHands(); await writeLobby(); await writeState();
  window.App.ui.enterLobbyUI();
}

async function hostNewGame(){
  // 重置所有在座玩家为存活、清空骰子记录与手牌
  H.players = H.players.map(p => p ? { ...p, alive:true, rolls:[], rollMap:{}, hand:[] } : p);

  // 发新牌并开始第 1 回合
  const seated = H.players.filter(p=>p);
  const deck = makeCustomDeck();
  if (seated.length * H.settings.startHand > deck.length) {
    H.settings.startHand = Math.max(1, Math.floor(deck.length / seated.length));
  }
  for (const p of H.players) { if (p) p.hand = deck.splice(0, H.settings.startHand); }

  H.roundNo = 1;
  H.target = TARGETS[rnd(TARGETS.length)];
  H.turn = H.players.findIndex(p=>p && p.alive);
  H.pot = [];
  H.awaitingReveal = false;
  H.challengerId = null;

  await sendHands(); await writeLobby(); await writeState();
}

/* ---------- Host 监听 actions（避免索引） ---------- */
function attachHostActionListener(){
  const { actions } = roomRefs(ROOM_ID);
  if (unsubActions) unsubActions();
  unsubActions = actions.orderBy('ts').limitToLast(100).onSnapshot(async (qs)=>{
    for (const ch of qs.docChanges()){
      if (ch.type !== 'added') continue;
      const doc = ch.doc; const a = doc.data()||{};
      if (a.processed) continue;
      try{
        switch(a.type){
          case 'TAKE_SEAT': await hostTakeSeat(a.seat, a.uid, a.name); break;
          case 'PLAY':      await hostPlay(a.uid, a.indices); break;
          case 'LIAR':      await hostLiar(a.uid); break;
          case 'REVEAL':    await hostReveal(); break;
          case 'HOST_APPLY':   if (a.uid===uid) await hostApplySettings(); break;
          case 'HOST_START':   if (a.uid===uid) await hostStart(); break;
          case 'HOST_RESTART': if (a.uid===uid) await hostRestart(); break;
          case 'BACK_TO_LOBBY': await hostBackToLobbyReset(); break;
        }
      } finally {
        await doc.ref.update({ processed:true, processedBy: uid });
      }
    }
  });
}

/* ---------- 公共监听 ---------- */
function attachCommonListeners(){
  const { lobby, state, events, hands } = roomRefs(ROOM_ID);

  if (unsubLobby) unsubLobby();
  unsubLobby = lobby.onSnapshot((doc)=>{
    if (!doc.exists) return; L = doc.data();
    window.App.ui.renderLobbyLocal(L, isHost);
    document.getElementById("roomShow").textContent = ROOM_ID;
    document.getElementById("roleShow").textContent = isHost ? t('roleHost') : t('roleGuest');
    document.getElementById("hostPanel").classList.toggle("hidden", !isHost);
    const btn = document.getElementById("btnStart"); if (btn && isHost) btn.disabled = !L.canStart;
  });

  if (unsubState) unsubState();
  unsubState = state.onSnapshot((doc)=>{
    if (!doc.exists) return; S = doc.data();
    window.App.ui.renderAll(S, {uid, myHand, selectedIndices, lastRevealRef:()=>lastReveal, setLastReveal:(v)=>lastReveal=v, lastTurnUidRef:()=>lastTurnUid, setLastTurnUid:(v)=>lastTurnUid=v});
  });

  if (unsubEvents) unsubEvents();
  unsubEvents = events.orderBy('ts').limitToLast(50).onSnapshot((qs)=>{
    qs.docChanges().forEach(ch=>{
      if (ch.type !== 'added') return;
      const id = ch.doc.id; if (processedEvents.has(id)) return;
      processedEvents.add(id);
      const e = ch.doc.data(); if (!e || !e.type) return;
      window.App.ui.onEvent(e, ()=>lastReveal);
    });
  });

  if (unsubMyHand) unsubMyHand();
  unsubMyHand = hands.doc(auth.currentUser.uid).onSnapshot((doc)=>{
    if (!doc.exists) return;
    const h = doc.data()?.hand || [];
    const newHash = h.map(c=>c.r).join('|');
    if (newHash !== myHandHash){
      myHand = h; myHandHash = newHash;
      selectedIndices.clear();
      if (S) window.App.ui.renderAll(S, {uid, myHand, selectedIndices, lastRevealRef:()=>lastReveal, setLastReveal:(v)=>lastReveal=v, lastTurnUidRef:()=>lastTurnUid, setLastTurnUid:(v)=>lastTurnUid=v});
    }
  });
}

/* ---------- 事件发送 ---------- */
async function sendAction(data){
  await ensureAuth();
  if (!uid) uid = auth.currentUser.uid;
  const { actions } = roomRefs(ROOM_ID);
  return actions.add({
    ...data,
    uid, name: me.name,
    ts: firebase.firestore.FieldValue.serverTimestamp(),
    processed:false
  });
}

/* ---------- 导出给 UI/主入口 ---------- */
window.App.logic = {
  hostInit, guestJoin,
  hostApplySettings, hostStart, hostRestart, hostBackToLobbyReset,
  sendAction,
  stateRefs: ()=>({ L,S }),
  sessionRefs: ()=>({ ROOM_ID, isHost, uid, me }),
  getSelected: ()=>selectedIndices,
};

