
  import { initializeApp, setLogLevel } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
  import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
  import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection, getDocs, writeBatch, enableNetwork } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
  setLogLevel('error');

  let app, auth, db;

  let _entryGranted   = false;
  let _navigatePatched = false;

  function _patchNavigate() {
    if (_navigatePatched || typeof window.navigate !== 'function') return;
    _navigatePatched = true;
    const _real = window.navigate;
    window.navigate = function(hash) {
      if (!_entryGranted) return;
      _real.call(this, hash);
    };
  }

  async function boot() {
    try {
      const mod = await import('./config.js');
      app  = initializeApp(mod.firebaseConfig);
      auth = getAuth(app);
      db   = getFirestore(app);
      window.__db   = db;
      window.__auth = auth;

      window._fsSet = (path, data) => setDoc(doc(db, path), data, { merge: true });
      window._fsGet = (path)       => getDoc(doc(db, path));

      onAuthStateChanged(auth, async (user) => {
        if (!user) {
          window.location.href = 'login.html';
        } else {
          const acctKey = user.uid || user.email || 'guest';
          const hydratePromise = _hydrateFromFirestore(acctKey);
          window.initDashboard(hydratePromise);
          await hydratePromise;
          _autoBackupToFirestore(acctKey);
          await _migrateInvoicesToCollection(acctKey);
          _startLiveSync(acctKey);
          _startInvoiceLiveSync(acctKey);
        }
      });

    } catch(err) {
      console.warn('Firebase not configured. Demo mode.');
      const demo = sessionStorage.getItem('a3mali_user');
      if (!demo) { window.location.href = 'login.html'; return; }
      window.initDashboard();
    }
  }

  function _mergeById(localArr, remoteArr) {
    const ts = o => Number(o && (o.updatedAt || o._updatedAt || o.timestamp || o.createdAt)) || 0;
    const map = new Map();
    (Array.isArray(remoteArr) ? remoteArr : []).forEach(o => { if (o && o.id != null) map.set(o.id, o); });
    const extras = [];
    (Array.isArray(localArr) ? localArr : []).forEach(o => {
      if (!o) return;
      if (o.id == null) { extras.push(o); return; }
      const ex = map.get(o.id);
      if (!ex || ts(o) > ts(ex)) map.set(o.id, o);
    });
    return Array.from(map.values()).concat(extras);
  }

  async function _hydrateFromFirestore(acctKey) {
    const arrayStores = ['customers','products','suppliers','expenses','cashbox',
                         'workOrders','employees','stockMoves','categories','debts',
                         'purchases','salesReps','salesTargets',
                         'installments','leaves','payroll','entries'];
    const objStores   = ['settings','printTemplates'];
    for (const kind of arrayStores) {
      const localKey = 'a3mali_' + kind + '_' + acctKey;
      try {
        const snap = await getDoc(doc(db, 'accounts/' + acctKey + '/data/' + kind));
        if (!snap.exists()) continue;
        const d = snap.data();
        const remote = Array.isArray(d.items) ? d.items : (Array.isArray(d) ? d : []);
        let local = [];
        try { local = JSON.parse(localStorage.getItem(localKey) || '[]'); } catch(e) {}
        localStorage.setItem(localKey, JSON.stringify(_mergeById(local, remote)));
      } catch(e) { }
    }
    for (const kind of objStores) {
      const localKey = 'a3mali_' + kind + '_' + acctKey;
      if (localStorage.getItem(localKey) !== null) continue;
      try {
        const snap = await getDoc(doc(db, 'accounts/' + acctKey + '/data/' + kind));
        if (!snap.exists()) continue;
        const d = snap.data();
        const payload = (d && d.items !== undefined) ? d.items : d;
        if (payload && typeof payload === 'object') localStorage.setItem(localKey, JSON.stringify(payload));
      } catch(e) { }
    }
  }

  const _liveSyncKinds = ['products','customers','debts','stockMoves','cashbox'];
  function _startLiveSync(acctKey) {
    if (window.__liveSyncStarted) return;
    window.__liveSyncStarted = true;
    _liveSyncKinds.forEach(kind => {
      try {
        onSnapshot(doc(db, 'accounts/' + acctKey + '/data/' + kind), (snap) => {
          if (!snap.exists()) return;
          const d = snap.data();
          const remote = Array.isArray(d.items) ? d.items : [];
          const localKey = 'a3mali_' + kind + '_' + acctKey;
          let local = [];
          try { local = JSON.parse(localStorage.getItem(localKey) || '[]'); } catch(e) {}
          const merged = _mergeById(local, remote);
          if (JSON.stringify(merged) === JSON.stringify(local)) return;
          localStorage.setItem(localKey, JSON.stringify(merged));
          if (typeof window._onLiveSync === 'function') window._onLiveSync(kind, merged);
        });
      } catch(e) { }
    });
  }

  async function _migrateInvoicesToCollection(acctKey) {
    try {
      const colRef = collection(db, 'accounts/' + acctKey + '/invoices');
      const existing = await getDocs(colRef);
      const existingIds = new Set();
      existing.forEach(d => existingIds.add(d.id));

      const legacySnap = await getDoc(doc(db, 'accounts/' + acctKey + '/data/invoices'));
      if (!legacySnap.exists()) return;
      const items = Array.isArray(legacySnap.data().items) ? legacySnap.data().items : [];
      const toMigrate = items.filter(inv => inv && inv.id != null && !existingIds.has(String(inv.id)));
      if (!toMigrate.length) return;

      for (let i = 0; i < toMigrate.length; i += 400) {
        const batch = writeBatch(db);
        toMigrate.slice(i, i + 400).forEach(inv => {
          batch.set(doc(db, 'accounts/' + acctKey + '/invoices/' + inv.id), inv);
        });
        await batch.commit();
      }
      console.info('[Migration] Copied', toMigrate.length, 'invoice(s) into the invoices collection.');
    } catch(e) { console.warn('[Migration] invoice migration skipped:', e); }
  }

  function _startInvoiceLiveSync(acctKey) {
    if (window.__invoiceLiveSyncStarted) return;
    window.__invoiceLiveSyncStarted = true;
    try {
      const colRef = collection(db, 'accounts/' + acctKey + '/invoices');
      onSnapshot(colRef, (snap) => {
        if (!Array.isArray(window._invoices)) window._invoices = [];
        let changed = false;
        snap.docChanges().forEach(change => {
          const inv = change.doc.data();
          const idx = window._invoices.findIndex(x => x.id === inv.id);
          if (change.type === 'removed') {
            if (idx !== -1) { window._invoices.splice(idx, 1); changed = true; }
          } else {
            if (idx === -1) window._invoices.unshift(inv);
            else            window._invoices[idx] = inv;
            changed = true;
          }
        });
        if (!changed) return;
        try { localStorage.setItem('a3mali_invoices_' + acctKey, JSON.stringify(window._invoices)); } catch(e) {}
        if (typeof window._onLiveSync === 'function') window._onLiveSync('invoices', window._invoices.slice());
      });
    } catch(e) { }
  }

  window._fsDeleteAllInvoices = async function(acctKey) {
    try {
      const colRef = collection(db, 'accounts/' + acctKey + '/invoices');
      const snap = await getDocs(colRef);
      const docs = snap.docs;
      for (let i = 0; i < docs.length; i += 400) {
        const batch = writeBatch(db);
        docs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
    } catch(e) { console.warn('[ClearAllData] failed to delete invoices collection:', e); }
  };

  async function _autoBackupToFirestore(acctKey) {
    try {
      const stores = ['invoices','customers','products','suppliers','expenses','cashbox',
                      'workOrders','employees','stockMoves','categories',
                      'debts','purchases','salesReps','salesTargets',
                      'installments','leaves','payroll','entries',
                      'settings','printTemplates'];
      const backup = { createdAt: Date.now(), acct: acctKey };
      stores.forEach(kind => {
        const raw = localStorage.getItem('a3mali_' + kind + '_' + acctKey);
        if (raw) try { backup[kind] = JSON.parse(raw); } catch(e) {}
      });
      await setDoc(doc(db, 'accounts/' + acctKey + '/backups/latest'), backup, { merge: false });
    } catch(e) { }
  }

  window.logout = async function() {
    try {
      if (auth) await signOut(auth);
    } catch(e) {}
    sessionStorage.removeItem('a3mali_user');
    window.location.href = 'login.html';
  };

  boot();

  import { OfflineDB } from './offline.js';

  window.OfflineDB  = OfflineDB;

  window.initDashboard = async function(hydratePromise) {
    _patchNavigate();

    try {
      if (typeof window.showEntryChoicePopup === 'function') {
        const choice = await window.showEntryChoicePopup();
        if (choice === 'cashier') {
          window.location.href = 'cashier.html';
          return;
        }
      }

      _entryGranted = true;

      if (hydratePromise) await hydratePromise;

      showLoading(false);

      const userData = JSON.parse(sessionStorage.getItem('a3mali_user') || '{}');
      const initials = (userData.name || 'م').charAt(0);

      const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      const shopName = (window._appSettings && window._appSettings.companyName)
        || userData.companyName || userData.name || userData.email || 'متجري';
      set('user-name',      shopName);
      set('user-role',      userData.email || '—');
      set('user-avatar',    (shopName || 'م').charAt(0));
      set('header-avatar',  initials);
      set('menu-user-name', userData.name || shopName || '');
      set('menu-user-email',userData.email || '');

      const theme = localStorage.getItem('a3mali_theme') || 'light';
      applyTheme(theme);
      if (typeof window.updateCurrencyLabel === 'function') window.updateCurrencyLabel();
      if (typeof window.updateSalesBadge   === 'function') window.updateSalesBadge();
      if (typeof window.updateNotifBadge   === 'function') window.updateNotifBadge();

      const _st = parseInt((window._appSettings || {}).sessionTimeout) || 0;
      if (_st > 0 && typeof window._startSessionTimeout === 'function') window._startSessionTimeout(_st);

      try { OfflineDB.init(); } catch(e) { console.warn('OfflineDB init failed', e); }
      window.addEventListener('online', async () => {
        updateSyncStatus('online');
        showToast('success', 'تم استعادة الاتصال — جارٍ مزامنة البيانات مع Firebase...');
        try { await enableNetwork(db); } catch(e) {}
        await new Promise(r => setTimeout(r, 2000));
        if (typeof window._saveData     === 'function') window._saveData();
        if (typeof window._saveSettings === 'function') window._saveSettings();
        if (window.OfflineDB && typeof window.OfflineDB.syncAll === 'function') {
          window.OfflineDB.syncAll();
        }
      });
      window.addEventListener('offline', () => updateSyncStatus('offline'));
      updateSyncStatus(navigator.onLine ? 'online' : 'offline');
    } catch (err) {
      showLoading(false);
      console.warn('Dashboard setup error (continuing to render):', err);
    }

    const hash = window.location.hash.replace('#','') || 'dashboard';
    if (typeof window.navigate === 'function') {
      window.navigate(hash);
    } else {
      const waitNav = setInterval(() => {
        if (typeof window.navigate === 'function') {
          clearInterval(waitNav);
          window.navigate(hash);
        }
      }, 50);
    }
  };

  function getRoleLabel(role) {
    const labels = {
      super_admin:   'مدير النظام العام',
      company_admin: 'مدير الشركة',
      manager:       'مدير',
      accountant:    'محاسب',
      cashier:       'كاشير',
      employee:      'موظف',
    };
    return labels[role] || role || 'مستخدم';
  }

  window.updateSyncStatus = function(status) {
    const indicators = document.querySelectorAll('.sync-indicator');
    const banner     = document.getElementById('offline-banner');
    const label      = document.getElementById('sync-label');

    indicators.forEach(el => {
      el.classList.remove('syncing','offline');
      if (status === 'offline') el.classList.add('offline');
    });

    if (label) label.textContent = status === 'online' ? 'متزامن' : 'غير متصل';
    banner.classList.toggle('show', status === 'offline');
  };
