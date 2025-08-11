window.addEventListener('DOMContentLoaded', ()=>{
  const { setLANG, applyStaticTexts, t } = window.App;
  const { ensureAuth } = window.App.firebase;
  const L = window.App.logic;
  const UI = window.App.ui;

  // 语言切换
  document.getElementById("langSel")?.addEventListener("change", (e)=>{
    setLANG(e.target.value);
    applyStaticTexts();
  });
  applyStaticTexts();

  // 登录指示
  ensureAuth().catch(()=>{});

  // 创建/加入房间
  document.getElementById("btnCreate").onclick = async ()=>{
    const name = (document.getElementById("nick").value||"Player").trim();
    const rid = Math.random().toString(36).slice(2,7).toUpperCase();
    await L.hostInit(rid, name);
    applyStaticTexts();
  };
  document.getElementById("btnJoin").onclick = async ()=>{
    const name = (document.getElementById("nick").value||"Player").trim();
    const rid = (document.getElementById("roomInput").value||"").trim();
    if (!rid) return alert(window.App.LANG()==='zh' ? "请输入房间号" : "Enter room ID");
    await L.guestJoin(rid, name);
    applyStaticTexts();
  };

  // 顶部按钮
  document.getElementById("btnResetAll").onclick = ()=> location.reload();

  // Host 控件
  const applySettingsLocal = async ()=>{ if (!L.sessionRefs().isHost) return; await L.hostApplySettings(); };
  document.getElementById("btnApply").onclick = applySettingsLocal;
  document.getElementById("seatMax").addEventListener("change", applySettingsLocal);
  document.getElementById("startHand").addEventListener("change", applySettingsLocal);
  document.getElementById("btnStart").onclick = async ()=>{ if (!L.sessionRefs().isHost) return; await L.hostStart(); };
  document.getElementById("btnHostRestart").onclick = async ()=>{ if (!L.sessionRefs().isHost) return; await L.hostRestart(); };

  // 出牌/质疑/翻开
  document.getElementById("btnPlay").onclick = async ()=>{
    const set = L.getSelected();
    if (set.size===0) return window.App.utils.toast(t('needOne'));
    const handDiv = document.getElementById("hand");
    const idxs = Array.from(set).sort((a,b)=>a-b);
    idxs.forEach(i=>{ const el = handDiv.children[i]; if (el) el.classList.add('burst'); });
    document.getElementById("btnPlay").disabled = true;
    setTimeout(async ()=>{
      await L.sendAction({ type:'PLAY', indices: idxs });
      set.clear();
      document.getElementById("btnPlay").textContent = t('play', 0);
      document.getElementById("btnPlay").disabled = false;
    }, 180);
  };
  document.getElementById("btnLiar").onclick = async ()=>{
    const felt = document.getElementById("felt");
    felt.classList.add('shake'); setTimeout(()=> felt.classList.remove('shake'), 420);
    if (navigator.vibrate) { try{ navigator.vibrate([80, 40, 120]); }catch{} }
    await L.sendAction({ type:'LIAR' });
  };
  document.getElementById("btnReveal").onclick = async ()=>{ await L.sendAction({ type:'REVEAL' }); };
  document.getElementById("btnBackLobby").onclick = async ()=>{
    document.getElementById("winnerWrap").classList.add("hidden");
    await L.sendAction({ type:'BACK_TO_LOBBY' });
  };

  // 让 UI 能设置 lastReveal（事件总线桥接）
  window.App.ui.setLastRevealLocal = (cards)=>{
    // 这里不会存储本地，host 会更新 S.awaitingReveal；renderAll 会根据 lastRevealRef 显示
    // 为了简单，直接在 renderAll 前后处理，由 game-host.js 控制 lastReveal 的生命周期
  };
});
