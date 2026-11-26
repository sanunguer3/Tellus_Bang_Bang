// Conta e administração: login por e-mail/senha, perfil por jogador e
// painel do dono para remover campeões publicados por outras pessoas.
(function (T) {
  'use strict';

  const $ = sel => T.$(sel);
  const bind = (sel, fn) => {
    const el = $(sel);
    if (el) el.addEventListener('click', fn);
  };

  T.renderLogin = () => {
    const who = $('#who');
    if (who) {
      who.textContent = T.user.signed
        ? (T.user.admin ? '👑 ' : '👤 ') + (T.user.nome || T.user.email || 'Jogador')
        : 'Visitante';
      who.title = T.user.signed ? T.user.email : 'Entre com e-mail e senha para salvar na nuvem';
    }
    const login = $('#btnLogin');
    if (login) login.hidden = !!T.user.signed;
    const logout = $('#btnLogout');
    if (logout) logout.hidden = !T.user.signed;
    const admin = $('#btnAdmin');
    if (admin) admin.hidden = !T.user.admin;
    const edAdmin = $('#eadmin');
    if (edAdmin) edAdmin.hidden = !T.user.admin;
  };

  function formMsg(text, kind) {
    const el = $('#lgmsg');
    if (!el) return;
    el.textContent = text || '';
    el.dataset.kind = kind || '';
  }

  T.openLogin = () => {
    if (!window.FB) {
      T.toast('Firebase indisponível. Seus campeões ficam salvos neste navegador.', 'warn', 5000);
      return;
    }
    const signed = T.user.signed;
    T.openModal(
      `<div class="modal-body" id="lgmodal">` +
        `<h2>${signed ? '👤 Minha conta' : '🔑 Entrar'}</h2>` +
        (signed
          ? `<p class="note">Conectado como <b>${T.esc(T.user.email)}</b>${T.user.admin ? ' · <b>dono</b>' : ''}. ` +
            `Seus campeões e configurações são salvos na nuvem e copiados neste navegador.</p>` +
            `<div class="row"><button id="btnLogout2" class="danger">Sair da conta</button>` +
            `<button data-close>Fechar</button></div>`
          : `<p class="note">Crie uma conta ou entre para salvar seus campeões, time, arena, dificuldade e câmera na nuvem.</p>` +
            `<div class="fm">` +
              `<label>Nome (só na criação)<input id="lgnome" maxlength="16" placeholder="Seu nome" value="${T.esc(T.nick || '')}"></label>` +
              `<label>E-mail<input id="lgem" type="email" autocomplete="email" placeholder="voce@email.com"></label>` +
              `<label>Senha<input id="lgsen" type="password" autocomplete="current-password" placeholder="mínimo 6 caracteres"></label>` +
            `</div>` +
            `<p class="hint" id="lgmsg" role="status" aria-live="polite"></p>` +
            `<div class="row"><button id="lgnew" class="go">Criar conta</button>` +
            `<button id="lglogin">Entrar</button><button data-close>Fechar</button></div>` +
            `<p class="hint">No Firebase, ative <b>Email/Password</b> em Authentication → Sign-in method.</p>`
        ) +
      `</div>`
    );
  };

  async function submit(register) {
    const email = $('#lgem') ? $('#lgem').value.trim() : '';
    const password = $('#lgsen') ? $('#lgsen').value : '';
    const nome = $('#lgnome') ? $('#lgnome').value.trim() : '';
    if (!email || !password) {
      formMsg('Preencha e-mail e senha.', 'err');
      return;
    }
    if (register && password.length < 6) {
      formMsg('A senha precisa ter pelo menos 6 caracteres.', 'err');
      return;
    }
    formMsg('Conectando…', 'wait');
    try {
      const user = await T.loginAccount(email, password, register, nome);
      T.toast('Bem-vindo, ' + (user.nome || user.email) + '!', 'ok');
      T.closeModal();
      if (T.renderMenu) T.renderMenu();
    } catch (err) {
      const code = err && err.code ? ' (' + err.code + ')' : '';
      formMsg((err && err.message ? err.message : 'Não foi possível entrar.') + code, 'err');
    }
  }

  function adminRow(c) {
    return `<div class="admrow">` +
      `<div><b>${T.esc(c.nome || 'Sem nome')}</b>` +
      `<small>${T.esc(c.usuario || 'jogador')} · ${T.esc(String(c.id).slice(0, 8))}…</small></div>` +
      `<div class="row tight"><button class="sm" data-admedit="${T.esc(c.id)}" data-admname="${T.esc(c.nome || '')}">Editar</button>` +
      `<button class="danger sm" data-admdel="${T.esc(c.id)}" data-admname="${T.esc(c.nome || '')}">Apagar</button></div>` +
      `</div>`;
  }

  T.openAdmin = async () => {
    if (!T.user.admin) {
      T.toast('Somente o dono pode abrir este painel.', 'warn');
      return;
    }
    if (!window.FB || !window.FB.adminList) {
      T.toast('Nuvem indisponível.', 'warn');
      return;
    }
    T.openModal(
      `<div class="modal-body" id="admModal">` +
        `<h2>🛡️ Painel do dono</h2>` +
        `<p class="note">Campeões publicados por outros jogadores. Sua conta (${T.esc(T.user.email)}) pode editar e apagar qualquer um deles. Ao editar, a autoria original continua com quem publicou.</p>` +
        `<div id="admList"><p class="hint">Carregando…</p></div>` +
        `<div class="row"><button data-close>Fechar</button></div>` +
      `</div>`
    );
    const host = $('#admList');
    try {
      const list = await window.FB.adminList();
      if (host) {
        host.innerHTML = list.length ? list.map(adminRow).join('') : '<p class="hint">Nenhum campeão de outro jogador na nuvem.</p>';
      }
    } catch (err) {
      if (host) host.innerHTML = '<p class="hint warn">Não foi possível carregar a lista: ' + T.esc(err && err.message) + '</p>';
    }
  };

  async function adminDelete(btn) {
    if (!T.user.admin) return;
    const id = btn.dataset.admdel;
    const name = btn.dataset.admname || 'este campeão';
    if (!confirm('Apagar o campeão "' + name + '" da nuvem?')) return;
    btn.disabled = true;
    try {
      const champ = { id };
      await T.adminDelete(champ);
      T.toast('Campeão apagado da nuvem.', 'ok');
      await T.openAdmin();
    } catch (err) {
      T.toast((err && err.message) || 'Não foi possível apagar.', 'err');
      btn.disabled = false;
    }
  }

  async function adminEdit(btn) {
    if (!T.user.admin) return;
    const id = btn.dataset.admedit;
    let idx = T.RO.findIndex(c => c.id === id);
    if (idx < 0 && T.loadCloud) {
      await T.loadCloud();
      idx = T.RO.findIndex(c => c.id === id);
    }
    if (idx < 0) {
      T.toast('Campeão não encontrado no elenco.', 'warn');
      return;
    }
    T.closeModal();
    T.openEditor(idx);
  }

  bind('#btnLogin', () => T.openLogin());
  bind('#btnLogout', () => T.logoutAccount().then(() => T.toast('Você saiu da conta.', 'info')));
  bind('#btnAdmin', () => T.openAdmin());
  bind('#eadmin', () => T.openAdmin());

  document.addEventListener('click', e => {
    const act = e.target.closest('button');
    if (!act) return;
    if (act.id === 'lglogin') submit(false);
    else if (act.id === 'lgnew') submit(true);
    else if (act.id === 'btnLogout2') {
      T.closeModal();
      T.logoutAccount().then(() => T.toast('Você saiu da conta.', 'info'));
    } else if (act.dataset.admedit) adminEdit(act);
    else if (act.dataset.admdel) adminDelete(act);
  });

  T.renderLogin();
})(window.TBB = window.TBB || {});
