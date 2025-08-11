window.App = window.App || {};

const app = firebase.initializeApp(window.firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

function setAuthBadge(txt, ok=false){
  const b = document.getElementById('authBadge');
  if (!b) return;
  b.textContent = 'Auth: ' + txt;
  b.style.borderColor = ok ? '#34d39980' : '#fb718580';
  b.style.color = ok ? '#34d399' : '#fb7185';
}

async function ensureAuth(){
  if (auth.currentUser){ setAuthBadge(auth.currentUser.uid.slice(0,8)+'…', true); return auth.currentUser; }
  const u = await auth.signInAnonymously();
  setAuthBadge(u.user.uid.slice(0,8)+'…', true);
  return u.user;
}

function roomRefs(roomId){
  const room = db.collection('rooms').doc(roomId);
  return {
    room,
    lobby: room.collection('meta').doc('lobby'),
    state: room.collection('meta').doc('state'),
    actions: room.collection('actions'),
    events: room.collection('events'),
    hands: room.collection('hands'),
  };
}

window.App.firebase = { app, auth, db, firebase, ensureAuth, roomRefs };
