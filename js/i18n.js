window.App = window.App || {};
let LANG = 'zh';

const i18n = {
  zh:{back:"返回主网页", title:"Liar’s Bar", refresh:"刷新页面",
    connectTitle:"进入或创建房间", nick:"你的昵称", room:"房间号（加入时填写）",
    create:"我是主机（创建房间）", join:"加入房间",
    localNote:"跨设备联机版（Firebase Firestore 实时）。",
    roomShow:"房间号：", role:"我的身份：", roleHost:"Host", roleGuest:"Guest",
    seats:"座位数（2–4）", startHand:"起始手牌",
    apply:"应用设置", start:"开始游戏", restart:"重开",
    seatsTip:"提示：点击空位即可入座；Host 调整座位数会出现/隐藏位置。",
    seatN:n=>`座位 ${n}`, joinSeat:"加入此座位", seated:"在座", eliminated:"淘汰",
    round:"回合：", target:"目标：", current:"当前：", yourTurn:"你的回合",
    table:"桌面", recent:(name,c)=>`最近：${name} × ${c}`, myHand:"我的手牌（点击选择任意张）", actions:"操作",
    play:c=>`出牌（${c}）`, liar:"liar", reveal:"翻开判定",
    revealHint:"只翻最近一次出牌，3 秒后判定并出现掷骰动画；失败者掷到 6 立刻死亡，或掷到同点第二次死亡。",
    handCount:c=>`手牌 ${c}`, diceList:r=>`骰：${r}`, playing:"出牌中", unknown:"未知",
    toastTurn:"你的回合", needOne:"请选择至少 1 张", need2p:"至少需要 2 名玩家入座",
    notEnough:"牌不够，请调小起始手牌或座位数",
    newGame:"再来一局",
    leaveSeat:"退出座位",
    winner:"胜利！", winText:"获得胜利 🎉", backLobby:"返回大厅", backHome:"返回主网页",
    claim:(who,target,count)=>`${who}：宣称 ${target} × ${count}`,
    rollBanner:(name,v,dead)=> dead ? `${name} 掷出 ${v} —— 淘汰！` : `${name} 掷出 ${v} —— 安全`,
    phNick:"例如：Lucas", phRoom:"例如：ABCD1",
  },
  en:{back:"Back to Home", title:"Liar’s Bar", refresh:"Refresh",
    connectTitle:"Join or Create a Room", nick:"Your nickname", room:"Room ID (to join)",
    create:"I'm Host (Create)", join:"Join Room",
    localNote:"Cross-device realtime (Firebase Firestore).",
    roomShow:"Room:", role:"Role:", roleHost:"Host", roleGuest:"Guest",
    seats:"Seats (2–4)", startHand:"Start hand",
    apply:"Apply", start:"Start Game", restart:"Restart",
    seatsTip:"Tip: click an empty seat to join; changing seats count shows/hides slots.",
    seatN:n=>`Seat ${n}`, joinSeat:"Join this seat", seated:"Seated", eliminated:"Eliminated",
    round:"Round:", target:"Target:", current:"Current:", yourTurn:"Your turn",
    table:"Table", recent:(name,c)=>`Recent: ${name} × ${c}`, myHand:"Your hand (pick any cards)", actions:"Actions",
    play:c=>`Play (${c})`, liar:"liar", reveal:"Reveal",
    newGame:"New Game",
    leaveSeat:"Leave seat",
    revealHint:"Only flip the last batch; resolve in 3s, then dice anim. Roll 6 = death, or 2nd time same pip = death.",
    handCount:c=>`Cards ${c}`, diceList:r=>`Dice: ${r}`, playing:"Playing", unknown:"Unknown",
    toastTurn:"Your turn", needOne:"Select at least 1", need2p:"Need at least 2 players",
    notEnough:"Not enough cards, reduce seats or start hand",
    winner:"Victory!", winText:"wins 🎉", backLobby:"Back to Lobby", backHome:"Back to Home",
    claim:(who,target,count)=>`${who}: claims ${target} × ${count}`,
    rollBanner:(name,v,dead)=> dead ? `${name} rolled ${v} — DEAD!` : `${name} rolled ${v} — safe`,
    phNick:"e.g., Lucas", phRoom:"e.g., ABCD1",
  }
};
function t(k,...a){ const v=i18n[LANG][k]; return typeof v==='function'?v(...a):(v??k); }

function applyStaticTexts(){
  document.documentElement.lang = LANG;
  const set = (id, txt) => { const el=document.getElementById(id); if (el) el.textContent = txt; };
  set('hdrBackTxt', t('back')); set('hdrTitle', t('title')); set('btnResetAll', t('refresh'));
  set('connTitle', t('connectTitle')); set('lblNick', t('nick')); set('lblRoom', t('room'));
  set('btnCreate', t('create')); set('btnJoin', t('join')); set('localNote', t('localNote'));
  set('lblRoomShow', t('roomShow')); set('lblRole', t('role')); set('lblSeats', t('seats'));
  set('lblStartHand', t('startHand')); set('btnApply', t('apply')); set('btnStart', t('start'));
  set('btnHostRestart', t('restart')); set('seatsTip', t('seatsTip')); set('lblRound', t('round'));
  set('lblTarget', t('target')); set('lblCurrent', t('current')); set('yourTurnTag', t('yourTurn'));
  set('lblTable', t('table')); set('lblMyHand', t('myHand')); set('lblActions', t('actions'));
  set('btnLiar', t('liar')); set('btnReveal', t('reveal')); set('revealHint', t('revealHint'));
  set('winTitle', t('winner')); set('winText', t('winText')); set('btnBackLobby', t('backLobby')); set('btnBackHome', t('backHome'));
  const nick=document.getElementById('nick'); if(nick) nick.placeholder=t('phNick');
  const room=document.getElementById('roomInput'); if(room) room.placeholder=t('phRoom');
  const btnNG = document.getElementById('btnNewGame');
  if (btnNG) btnNG.textContent = t('newGame');
}
window.App.LANG = () => LANG;
window.App.setLANG = (l)=>{ LANG=l; applyStaticTexts(); };
window.App.t = t;
window.App.applyStaticTexts = applyStaticTexts;


