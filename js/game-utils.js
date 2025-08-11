window.App = window.App || {};
const { t } = window.App;

const TARGETS = ["A","Q","K"];
const rnd = n => Math.floor(Math.random()*n);
const shuffle = a => { for(let i=a.length-1;i>0;i--){const j=rnd(i+1); [a[i],a[j]]=[a[j],a[i]];} return a; };
function makeCustomDeck(){ const d=[]; d.push({r:"JOKER"},{r:"JOKER"}); for(let i=0;i<6;i++){d.push({r:"A"},{r:"Q"},{r:"K"});} return shuffle(d); }
const isMatch = (c, target) => c.r==="JOKER" || c.r===target;
function nextAliveFrom(state, idx){ const n=state.players.length; for(let k=1;k<=n;k++){const j=(idx+k)%n; if(state.players[j] && state.players[j].alive) return j;} return idx; }
function toast(msg){ const tdiv=document.getElementById('toast'); if(!tdiv) return; tdiv.firstElementChild.textContent=msg; tdiv.classList.remove('hidden'); setTimeout(()=>tdiv.classList.add('hidden'),1600); }

window.App.utils = { TARGETS, rnd, shuffle, makeCustomDeck, isMatch, nextAliveFrom, toast };
