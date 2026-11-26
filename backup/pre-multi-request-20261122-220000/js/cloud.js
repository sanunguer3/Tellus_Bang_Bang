// Nuvem (Firebase compat): login por e-mail/senha, perfil por jogador e
// campeões compartilhados. Continua funcionando como script clássico em file://.
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
  const champs = () => db.collection('campeoes');
  const profileDoc = uid => db.collection('usuarios').doc(uid);
  // Salas PvP: exposto sem quebrar as chamadas existentes de window.FB.
  const roomDoc = code => db.collection('salas').doc(String(code).toUpperCase());

  const plainUser = user => user ? {
    uid: user.uid || '',
    email: user.email || '',
    displayName: user.displayName || ''
  } : null;

  let current = null;
  let resolveReady = null;
  const ready = new Promise(resolve => { resolveReady = resolve; });
  let booted = false;

  auth.onAuthStateChanged(user => {
    current = plainUser(user);
    if (resolveReady) resolveReady(current);
    if (T.setUser) T.setUser(current);
    if (booted && T.loadCloud) T.loadCloud();
    booted = true;
  });

  window.FBU = () => (current && current.uid) || '';

  async function needUser() {
    const user = current || await ready;
    if (!user) throw new Error('Entre com e-mail e senha primeiro.');
    return user;
  }

  function needAdmin() {
    const email = (current && current.email) || '';
    if (!T.isAdminEmail(email)) {
      throw new Error('Somente o dono pode editar ou apagar campeões de outras pessoas.');
    }
    return current;
  }

  function slimProfile(profile) {
    return Object.assign({}, profile, {
      roster: (profile.roster || []).map(c => Object.assign({}, c, {
        sprite: undefined,
        sks: (c.sks || []).map(s => Object.assign({}, s, { sprite: undefined, castSprite: undefined }))
      }))
    });
  }

  window.FB = {
    ready,
    uid: () => (current && current.uid) || '',
    room: roomDoc,
    fieldValue: firebase.firestore.FieldValue,

    async signUp(email, password, nome) {
      const mail = String(email || '').trim();
      if (!mail || !password) throw new Error('Preencha e-mail e senha.');
      const cred = await auth.createUserWithEmailAndPassword(mail, password);
      const name = String(nome || mail.split('@')[0]).slice(0, 16);
      if (cred.user && cred.user.updateProfile) {
        try { await cred.user.updateProfile({ displayName: name }); } catch (err) { /* ignore */ }
      }
      current = plainUser(auth.currentUser) || plainUser(cred.user);
      current.displayName = name;
      if (resolveReady) resolveReady(current);
      if (T.setUser) T.setUser(current);
      return current;
    },

    async signIn(email, password) {
      const mail = String(email || '').trim();
      if (!mail || !password) throw new Error('Preencha e-mail e senha.');
      const cred = await auth.signInWithEmailAndPassword(mail, password);
      current = plainUser(auth.currentUser) || plainUser(cred.user);
      if (resolveReady) resolveReady(current);
      if (T.setUser) T.setUser(current);
      return current;
    },

    async signOut() {
      await auth.signOut();
      current = null;
    },

    async loadProfile() {
      const user = await needUser();
      const snap = await profileDoc(user.uid).get();
      if (!snap.exists) return null;
      const data = snap.data() || {};
      let profile = null;
      try { profile = JSON.parse(data.json); } catch (err) { /* perfil inválido */ }
      return profile ? Object.assign(profile, { nome: data.nome || profile.nick || '' }) : null;
    },

    async saveProfile(profile) {
      const user = await needUser();
      let json = JSON.stringify(profile || {});
      if (json.length > 900000) {
        json = JSON.stringify(slimProfile(profile || {}));
        if (T.toast) T.toast('Perfil grande demais: sprites ficaram só neste navegador.', 'warn', 5000);
      }
      if (json.length > 990000) throw new Error('Perfil grande demais para a nuvem.');
      await profileDoc(user.uid).set({
        nome: String((profile && profile.nome) || (profile && profile.nick) || user.email.split('@')[0]).slice(0, 16),
        email: user.email,
        json,
        atualizado: Date.now()
      });
    },

    async load() {
      const snap = await champs().limit(500).get();
      return snap.docs.map(d => {
        const data = d.data();
        let champ = null;
        try { champ = JSON.parse(data.json); } catch (err) { /* documento inválido */ }
        return champ && Object.assign(champ, {
          id: d.id,
          dono: data.dono || '',
          usuario: data.usuario || ''
        });
      }).filter(Boolean);
    },

    async save(champ) {
      const user = await needUser();
      const clean = T.san(champ);
      if (!clean) throw new Error('Campeão inválido.');
      const { id, dono, usuario, ...rest } = clean;
      const json = JSON.stringify(rest);
      if (json.length > 90000) throw new Error('Campeão grande demais para a nuvem.');
      let owner = user.uid;
      let author = user.email;
      if (id) {
        const old = await champs().doc(id).get();
        const data = old.data() || {};
        if (data.dono && data.dono !== user.uid && !T.isAdminEmail(user.email)) {
          throw new Error('Esse campeão pertence a outro jogador.');
        }
        // Mesmo quando o dono edita, a autoria continua com quem publicou.
        owner = data.dono || user.uid;
        author = data.usuario || user.email;
      }
      const data = {
        dono: owner,
        usuario: author,
        nome: clean.n,
        json
      };
      if (id) {
        await champs().doc(id).set(data);
        return { id, dono: owner, usuario: author };
      }
      const ref = await champs().add(data);
      return { id: ref.id, dono: owner, usuario: author };
    },

    async del(id, champ) {
      const user = await needUser();
      const old = await champs().doc(id).get();
      const data = old.data() || {};
      const owner = (champ && champ.dono) || data.dono || '';
      if (owner && owner !== user.uid && !T.isAdminEmail(user.email)) {
        throw new Error('Você só pode apagar seus próprios campeões.');
      }
      await champs().doc(id).delete();
    },

    async adminList() {
      const list = await this.load();
      return list
        .filter(c => c.id && c.dono && c.dono !== FBU())
        .map(c => ({ id: c.id, nome: c.n, dono: c.dono, usuario: c.usuario || '' }));
    },

    async adminDelete(id) {
      needAdmin();
      const doc = await champs().doc(id).get();
      const data = doc.data() || {};
      if (data.dono && data.dono === FBU() && !T.user.admin) {
        throw new Error('Não é possível apagar seu próprio campeão por aqui.');
      }
      await champs().doc(id).delete();
    }
  };

  if (T && T.loadCloud) T.loadCloud();
})(window.TBB = window.TBB || {});
