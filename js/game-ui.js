window.App = window.App || {};
const { t, applyStaticTexts } = window.App;
const { toast } = window.App.utils;

function enterLobbyUI(){ document.getElementById("connect").classList.add("hidden"); document.getElementById("game").classList.add("hidden"); document.getElementById("lobby").classList.remove("hidden"); }
function enterGameUI(){ document.getElementById("lobby").classList.add("hidden"); document.getElementById("game").classList.remove("hidden"); }

function glyphFor(r){ switch(r){ case 'A': return '✪'; case 'K': return '♚'; case 'Q': return '👑'; case 'JOKER': return '🃏'; default: return ''; } }
function cardFrontHTML(r){ return `<div class="front">${r!=='?'?`<span class="rank">${r==='JOKER'?'JK':r}</span><span class="glyph">${glyphFor(r)}</span>`:'<span class="rank">?</span>'}</div>`; }
function cardBackHTML(){ return `<div class="back">🂠</div>`; }

function diceSVG(n){
  const spots = {
    1:[[50,50]], 2:[[25,25],[75,75]], 3:[[25,25],[50,50],[75,75]],
    4:[[25,25],[25,75],[75,25],[75,75]],
    5:[[25,25],[25,75],[50,50],[75,25],[75,75]],
    6:[[25,25],[25,50],[25,75],[75,25],[75,50],[75,75]]
  }[n]||[[50,50]];
  return `<svg viewBox="0 0 100 100" width="64" height="64" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="6" width="88" height="88" rx="16" fill="#0b1224" stroke="#93c5fd" stroke-opacity=".55"/>
    ${spots.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="6" fill="#e5ecff"/>`).join('')}
  </svg>`;
}
function showDice(finalValue, who){
  const DICE_TURNS=14, DICE_BASE=70, DICE_INC=35, DICE_HOLD=1000;
  const layer = document.getElementById('diceLayer');
  const box = document.getElementById('diceBox');
  layer.classList.remove('hidden'); box.classList.add('spin');

  const rolls=[]; for(let i=0;i<DICE_TURNS;i++) rolls.push(1+Math.floor(Math.random()*6)); rolls.push(finalValue);
  let delay=0;
  rolls.forEach((val,i)=>{
    delay += DICE_BASE + i*DICE_INC;
    setTimeout(()=>{
      box.innerHTML = diceSVG(val)+(who?`<div style="margin-top:8px;font-size:14px;opacity:.9">${who}</div>`:'');
      if (i===rolls.length-1){ box.classList.remove('spin'); setTimeout(()=>layer.classList.add('hidden'), DICE_HOLD); }
    }, delay);
  });
}
function showSmoke(){
  const layer = document.getElementById('smokeLayer');
  layer.innerHTML=''; layer.classList.remove('hidden');
  const count = 36;
  for(let i=0;i<count;i++){
    const s=document.createElement('div'); s.className='puff';
    const left=Math.random()*100, delay=Math.random()*0.8, dur=2.2+Math.random()*1.2, drift=(-30+Math.random()*60)+'vw';
    s.style.left = `calc(${left}vw - 60px)`;
    s.style.animationDuration = `${dur}s`; s.style.animationDelay = `${delay}s`;
    s.style.setProperty('--x', drift);
    layer.appendChild(s);
  }
  setTimeout(()=>layer.classList.add('hidden'), 3000);
}
function launchConfetti(){
  const colors=['#f472b6','#60a5fa','#fbbf24','#34d399','#a78bfa','#f87171','#22d3ee'];
  const n=120;
  for(let i=0;i<n;i++){
    const c=document.createElement('div'); c.className='confetti';
    const x=Math.random()*100, tx=(Math.random()*60-30)+'vw', rot=(Math.random()*720-360)+'deg', dur=1.6+Math.random()*1.2;
    c.style.left=x+'vw'; c.style.background=`linear-gradient(180deg, ${colors[Math.floor(Math.random()*colors.length)]}, #fff0)`;
    c.style.setProperty('--tx', tx); c.style.setProperty('--rot', rot); c.style.animationDuration=dur+'s';
    document.body.appendChild(c); setTimeout(()=>c.remove(), dur*1000);
  }
}
function potFlashOnce(){ const felt = document.getElementById('felt'); felt.classList.add('pot-flash'); setTimeout(()=>felt.classList.remove('pot-flash'), 550); }
function showRollBanner(playerUid, name, value, died){
  const card = document.querySelector(`#playersRow [data-uid="${playerUid}"] .roll-banner-area`);
  if (!card) return;
  card.innerHTML = `<div class="roll-banner">${window.App.i18n?.rollBanner?.(name,value,died) ?? window.App.t('rollBanner', name, value, died)}</div>`;
  setTimeout(()=>{ card.innerHTML=""; }, 1200);
}

/* ------- 渲染大厅 ------- */
function renderLobbyLocal(lobby, isHost){
  applyStaticTexts();
  const seats = document.getElementById("seats"); seats.innerHTML="";
  const seatsN = lobby.settings.seats;
  for(let i=0;i<seatsN;i++){
    const cell = document.createElement('div'); cell.className = "rounded-xl p-3 border border-[#334155] bg-[#0b142a]";
    const occupant = lobby.seats[i];
    if (occupant){
      cell.innerHTML = `<div class="font-semibold mb-1">${t('seatN', i+1)}</div>
        <div class="opacity-90">${occupant.name}</div>
        <div class="text-sm opacity-70 mt-1">${occupant.alive? t('seated') : t('eliminated')}</div>`;
    } else {
      cell.innerHTML = `<div class="font-semibold mb-2">${t('seatN', i+1)}</div>
        <button class="btn btn-green w-full">${t('joinSeat')}</button>`;
      const btn = cell.querySelector('button');
      btn.onclick = ()=> window.App.logic.sendAction({ type:'TAKE_SEAT', seat:i }).catch(()=>{});
    }
    seats.appendChild(cell);
  }
}

/* ------- 渲染游戏/桌面 ------- */
function renderAll(S, ctx){
  const { uid, myHand, selectedIndices, lastRevealRef, setLastReveal, lastTurnUidRef, setLastTurnUid } = ctx;
  if (!S) return;
  if (!S.awaitingReveal) setLastReveal(null);

  if (S.winner){
    document.getElementById("winnerName").textContent = S.winner.name;
    document.getElementById("winnerWrap").classList.remove("hidden");
    launchConfetti();
  }
  enterGameUI();
  document.getElementById("roundNo").textContent = S.roundNo||1;
  document.getElementById("targetRank").textContent = S.target||"-";
  const currentSeat = S.turn;
  const currentPlayer = S.players[currentSeat];
  document.getElementById("currentPlayer").textContent = currentPlayer ? currentPlayer.name : "-";

  const row = document.getElementById("playersRow"); row.innerHTML="";
  S.players.forEach((p,i)=>{
    if (p===null) return;
    const wrap = document.createElement('div');
    wrap.className = "rounded-xl p-3 border " + (i===currentSeat?"border-sky-400/60":"border-[#334155] bg-[#0b142a]");
    wrap.dataset.uid = p.uid || '';
    if (!p.alive) wrap.classList.add("dead");
    const rollsTxt = p.rolls?.length ? p.rolls.join(", ") : "—";
    wrap.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="font-semibold">${p.name}</div>
        <div class="text-sm opacity-80">${t('handCount', p.handCount)}</div>
      </div>
      <div class="flex items-center gap-2 text-sm flex-wrap mt-1">
        <span class="badge">${t('diceList', rollsTxt)}</span>
        ${p.alive ? '' : `<span class="badge" style="border-color:#fb7185;color:#fb7185">${t('eliminated')}</span>`}
        ${i===currentSeat && p.alive ? `<span class="badge" style="border-color:#818cf8;color:#a5b4fc">${t('playing')}</span>` : ''}
      </div>
      <div class="roll-banner-area"></div>
    `;
    row.appendChild(wrap);
  });

  const potDiv = document.getElementById("pot"); potDiv.innerHTML="";
  if (S.pot.length){
    const revealMode = !!S.awaitingReveal;
    const batches = revealMode ? [ S.pot[S.pot.length-1] ] : S.pot;

    batches.forEach((batch, idx)=>{
      const rowDiv = document.createElement('div'); rowDiv.className = "flex items-center gap-3 mb-2 flex-wrap";
      const who = (S.players.find(x=>x && x.uid===batch.by)||{}).name || t('unknown');
      rowDiv.innerHTML = `<span class="text-sm opacity-90 px-2 py-1 rounded bg-[#0b142a] border border-[#334155]">${t('claim', who, S.target, batch.count)}</span>`;

      const cards = document.createElement('div'); cards.className="flex flex-wrap";
      const isRevealBatch = revealMode && idx===batches.length-1 && lastRevealRef();

      for(let k=0;k<batch.count;k++){
        const holder=document.createElement('div'); holder.className="card";
        const inner=document.createElement('div'); inner.className="inner";
        if (isRevealBatch && lastRevealRef()[k]){
          const r = lastRevealRef()[k].r;
          inner.innerHTML = cardFrontHTML(r)+cardBackHTML();
          if (r==="JOKER") holder.classList.add('joker');
          holder.classList.add('face-back','revealable');
        } else {
          inner.innerHTML = cardFrontHTML('?')+cardBackHTML();
          holder.classList.add('face-back');
        }
        holder.appendChild(inner); cards.appendChild(holder);
      }
      rowDiv.appendChild(cards); potDiv.appendChild(rowDiv);
    });

    if (S.awaitingReveal && lastRevealRef()){
      requestAnimationFrame(()=>{
        document.querySelectorAll('#pot .revealable.face-back').forEach(h=>{ h.classList.remove('face-back'); });
      });
    }
  }
  document.getElementById("lastClaim").textContent = S.lastClaim ? t('recent', (S.players.find(p=>p&&p.uid===S.lastClaim.by)||{}).name||t('unknown'), S.lastClaim.count) : "—";
  if (S.lastClaim) potFlashOnce();

  const yourTurnTag = document.getElementById("yourTurnTag");
  const amIturn = (currentPlayer && currentPlayer.uid===uid && currentPlayer.alive);
  document.getElementById("btnReveal").classList.toggle("hidden", !S.awaitingReveal);
  document.getElementById("btnPlay").disabled = S.awaitingReveal || !amIturn || (myHand.length===0);
  document.getElementById("btnLiar").disabled = S.awaitingReveal || S.pot.length===0 || !amIturn;
  yourTurnTag.classList.toggle("hidden", !amIturn);

  const nowTurnUid = currentPlayer ? currentPlayer.uid : null;
  if (nowTurnUid === uid && lastTurnUidRef() !== uid){ toast(t('toastTurn')); }
  setLastTurnUid(nowTurnUid);

  renderHandOnly(myHand, selectedIndices);
}

function renderHandOnly(myHand, selectedIndices){
  const handDiv = document.getElementById("hand"); if (!handDiv) return;
  handDiv.innerHTML = "";
  (myHand||[]).forEach((card, idx)=>{
    const holder=document.createElement('div'); holder.className="card"+(card.r==="JOKER"?" joker":"")+(selectedIndices.has(idx)?" sel":"");
    const inner=document.createElement('div'); inner.className="inner";
    inner.innerHTML = cardFrontHTML(card.r)+cardBackHTML();
    holder.appendChild(inner);
    holder.onclick = ()=>{
      if (selectedIndices.has(idx)) selectedIndices.delete(idx); else selectedIndices.add(idx);
      document.getElementById("btnPlay").textContent = t('play', selectedIndices.size);
      holder.classList.toggle("sel");
    };
    handDiv.appendChild(holder);
  });
  document.getElementById("btnPlay").textContent = t('play', selectedIndices.size);
}

/* ------- 事件回调 ------- */
function onEvent(e, getLastReveal){
  switch(e.type){
    case "REVEAL_VIEW":
      window.App.ui.setLastRevealLocal(e.payload?.cards||[]);
      toast(window.App.LANG()==='zh' ? "正在翻开最近一次出牌…" : "Revealing last batch…");
      break;
    case "DICE_ANIM":
      showDice(e.payload?.value||1, e.payload?.who||'');
      break;
    case "DICE_RESULT":
      showRollBanner(e.payload?.uid, e.payload?.who, e.payload?.value, e.payload?.died);
      break;
  }
}
function setLastRevealLocal(cards){ /* 仅用于本地赋值的桥接，由 main.js 安装 */ }

window.App.ui = {
  enterLobbyUI, enterGameUI,
  renderLobbyLocal, renderAll,
  showSmoke, showDice, launchConfetti,
  onEvent, setLastRevealLocal,
};
