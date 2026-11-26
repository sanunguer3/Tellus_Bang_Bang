// Nuvem (Firebase compat): campeões compartilhados entre jogadores.
// Usa scripts clássicos para funcionar também ao abrir o index.html direto (file://).
(function (T) {
  'use strict';

  if (!window.firebase) {
    console.warn('SDK do Firebase não carregou (offline?).');
    if (T && T.cloudStatus) T.cloudStatus('nuvem indisponível', 'warn');
    return;
  }

  const firebaseConfig = {
    apiKey: "AIzaSyAExJHgYINl4_cs_2GyJeV_fHIjVHy86n8",
    authDomain: "tellus-bang-bang.firebaseapp.com",
    projectId: "tellus-bang-bang",
    storageBucket: "tellus-bang-bang.firebasestorage.app",
    messagingSenderId: "333511727483",
    appId: "1:333511727483:web:b79bcf864e54144bdc45de"
  };

  try {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  } catch (err) {
    console.warn('Falha ao inicializar o Firebase:', err);
    T.cloudStatus('nuvem indisponível', 'warn');
    return;
  }

  const auth = firebase.auth();
  const db = firebase.firestore();

  const ready = auth.signInAnonymously()
    .then(cred => cred.user)
    .catch(err => {
      console.warn('Login anônimo indisponível:', err && err.code);
      if (T && T.cloudStatus) T.cloudStatus('sem login', 'warn');
      return null;
    });

  window.FBU = () => (auth.currentUser && auth.currentUser.uid) || '';

  window.FB = {
    ready,

    async load() {
      await ready;
      const snap = await db.collection('campeoes').limit(500).get();
      return snap.docs.map(d => {
        const data = d.data();
        let champ = null;
        try { champ = JSON.parse(data.json); } catch (e) { /* documento inválido */ }
        return champ && { ...champ, id: d.id, dono: data.dono };
      });
    },

    async save(champ) {
      const user = await ready;
      if (!user) throw new Error('Sem autenticação anônima.');
      const clean = T.san(champ);
      if (!clean) throw new Error('Campeão inválido.');
      const { id, dono, ...rest } = clean;
      const json = JSON.stringify(rest);
      if (json.length > 90000) throw new Error('Campeão grande demais para a nuvem.');
      const data = { dono: user.uid, nome: clean.n, json };
      if (id) {
        await db.collection('campeoes').doc(id).set(data);
        return { id, dono: user.uid };
      }
      const ref = await db.collection('campeoes').add(data);
      return { id: ref.id, dono: user.uid };
    },

    async del(id) {
      await ready;
      await db.collection('campeoes').doc(id).delete();
    }
  };

  if (T && T.loadCloud) T.loadCloud();
})(window.TBB = window.TBB || {});
