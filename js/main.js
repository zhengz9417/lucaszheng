// js/main.js

(function () {
  function initMain() {
    const { setLANG, applyStaticTexts, t } = window.App;
    const { ensureAuth } = window.App.firebase;
    const L  = window.App.logic;
    const UI = window.App.ui;

    // —— 胜利弹窗“再来一局” ——（Host 才会显示；显示逻辑在 renderAll 里）
    const ngBtn = document.getElementById("btnNewGame");
    if (ngBtn) {
      ngBtn.onclick = async () => {
        if (!L.sessionRefs().isHost) return;
        document.getElementById("winnerWrap").classList.add("hidden");
        await L.sendAction({ type:'HOST_NEW_GAME' });
      };
    }

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

    // —— 创建/加入房间 ——（这里加一点日志，方便你在手机上打开调试看看）
    const btnCreate = document.getElementById("btnCreate");
    if (btnCreate) {
      btnCreate.onclick = async ()=>{
        console.log('[UI] Create clicked');
        const name = (document.getElementById("nick").value||"Player").trim();
        const rid  = Math.random().toString(36).slice(2,7).toUpperCase();
        await L.hostInit(rid, name);
        applyStaticTexts();
      };
    }

    const btnJoin = document.getElementById("btnJoin");
    if (btnJoin) {
      btnJoin.onclick = async ()=>{
        console.log('[UI] Join clicked');
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

    // 事件总线桥接（保留）
    window.App.ui.setLastRevealLocal = (cards)=>{};
  }

  // ⭐ 关键：无论脚本何时加载，都能运行 initMain
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMain, { once:true });
  } else {
    // DOM 已经 ready 了，直接跑
    initMain();
  }
})();
