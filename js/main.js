window.addEventListener('DOMContentLoaded', ()=> {
  const { setLANG, applyStaticTexts, t } = window.App;
  const { ensureAuth } = window.App.firebase;
  const L  = window.App.logic;
  const UI = window.App.ui;

  // 顶部：胜利弹窗里的“再来一局”（Host 才会显示；显示逻辑在 renderAll 里）
  const ngBtn = document.getElementById("btnNewGame");
  if (ngBtn) {
    ngBtn.onclick = async () => {
      if (!L.sessionRefs().isHost) return;
      document.getElementById("winnerWrap").classList.add("hidden");
      await L.sendAction({ type:'HOST_NEW_GAME' });
    };
  }
  // 大厅卡片上的“退出座位”按钮不在这里绑定（已在 game-ui.js 内部按座位动态绑定）

  // 语言切换
  const langSel = document.getElementById("langSel");
  if (langSel) {
    langSel.addEventListener("change", (e)=>{
      setLANG(e.target.value);
      applyStaticTexts();
    });
  }
  applyStaticTexts();

  // 登录指示
  ensureAuth().catch(()=>{});

  // 创建/加入房间
  const btnCreate = document.getElementById("btnCreate");
  if (btnCreate) {
    btnCreate.onclick = async ()=>{
      const name = (document.getElementById("nick").value||"Player").trim();
      const rid  = Math.random().toString(36).slice(2,7).toUpperCase();
      await L.hostInit(rid, name);
      applyStaticTexts();
    };
  }

  const btnJoin = document.getElementById("btnJoin");
  if (btnJoin) {
    btnJoin.onclick = async ()=>{
      const name = (document.getElementById("nick").value||"Player").trim();
      const rid  = (document.getElementById("roomInput").value||"").trim();
      if (!rid) return alert(window.App.LANG()==='zh' ? "请输入房间号" : "Enter room ID");
      await L.guestJoin(rid, name);
      applyStaticTexts();
    };
  }

  // 顶部按钮
  const btnReset = document.getElementById("btnResetAll");
  if (btnReset) btnReset.onclick = ()=> location.reload();

  // Host 控件
  const applySettingsLocal = async ()=>{ if (!L.sessionRefs().isHost) return; await L.hostApplySettings(); };
  const btnApply = document.getElementById("btnApply");
  if (btnApply) btnApply.onclick = applySettingsLocal;

  const seatMax = document.getElementById("seatMax");
  if (seatMax) seatMax.addEventListener("change", applySettingsLocal);

  const startHand = document.getElementById("startHand");
  if (startHand) startHand.addEventListener("change", applySettingsLocal);

  const btnStart = document.getElementById("btnStart");
  if (btnStart) btnStart.onclick = async ()=>{ if (!L.sessionRefs().isHost) return; await L.hostStart(); };

  const btnHostRestart = document.getElementById("btnHostRestart");
  if (btnHostRestart) btnHostRestart.onclick = async ()=>{ if (!L.sessionRefs().isHost) return; await L.hostRestart(); };

  // 出牌/质疑/翻开
  const btnPlay = document.getElementById("btnPlay");
  if (btnPlay) {
    btnPlay.onclick = async ()=>{
      const set = L.getSelected();
      if (set.size===0) return window.App.utils.toast(t('needOne'));
      const handDiv = document.getElementById("hand");
      const idxs = Array.from(set).sort((a,b)=>a-b);
      idxs.forEach(i=>{ const el = handDiv.children[i]; if (el) el.classList.add('burst'); });
      btnPlay.disabled = true;
      setTimeout(async ()=>{
        await L.sendAction({ type:'PLAY', indices: idxs });
        set.clear();
        btnPlay.textContent = t('play', 0);
        btnPlay.disabled = false;
      }, 180);
    };
  }

  const btnLiar = document.getElementById("btnLiar");
  if (btnLiar) {
    btnLiar.onclick = async ()=>{
      const felt = document.getElementById("felt");
      if (felt){ felt.classList.add('shake'); setTimeout(()=> felt.classList.remove('shake'), 420); }
      if (navigator.vibrate) { try{ navigator.vibrate([80, 40, 120]); }catch{} }
      await L.sendAction({ type:'LIAR' });
    };
  }

  const btnReveal = document.getElementById("btnReveal");
  if (btnReveal) btnReveal.onclick = async ()=>{ await L.sendAction({ type:'REVEAL' }); };

  const btnBackLobby = document.getElementById("btnBackLobby");
  if (btnBackLobby) {
    btnBackLobby.onclick = async ()=>{
      document.getElementById("winnerWrap").classList.add("hidden");
      await L.sendAction({ type:'BACK_TO_LOBBY' });
    };
  }

  // 让 UI 能设置 lastReveal（事件总线桥接）
  window.App.ui.setLastRevealLocal = (cards)=>{
    // 这里不会存储本地，host 会更新 S.awaitingReveal；renderAll 会根据 lastRevealRef 显示
    // 为了简单，直接在 renderAll 前后处理，由 game-host.js 控制 lastReveal 的生命周期
  };
});
