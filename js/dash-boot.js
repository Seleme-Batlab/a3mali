// ============================================================
//  أعمالي ERP — Dashboard Boot & App Initialization (module)
//  Firebase auth bootstrap + module imports + initDashboard
//  Extracted from dashboard.html (was inline <script type="module">)
// ============================================================

  import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
  import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
  import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection, getDocs, writeBatch } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

  let app, auth, db;

  async function boot() {
    try {
      const mod = await import('./config.js');
      app  = initializeApp(mod.firebaseConfig);
      auth = getAuth(app);
      db   = getFirestore(app);
      window.__db   = db;
      window.__auth = auth;

      // ── Firestore helpers (available to classic dash.js via window) ──
      window._fsSet = (path, data) => setDoc(doc(db, path), data, { merge: true });
      window._fsGet = (path)       => getDoc(doc(db, path));

      onAuthStateChanged(auth, async (user) => {
        if (!user) {
          window.location.href = 'login.html';
        } else {
          const acctKey = user.uid || user.email || 'guest';
          // Hydrate stores from Firestore if localStorage is empty for that key
          await _hydrateFromFirestore(acctKey);
          // Auto-backup on every admin session start
          _autoBackupToFirestore(acctKey);
          window.initDashboard();
          // One-time carry-over of any invoices still sitting in the legacy
          // single-doc array store into the real invoices collection, then
          // subscribe live. Awaited so the first snapshot already includes them.
          await _migrateInvoicesToCollection(acctKey);
          // Live sync: reflect cashier sales/stock/customer changes instantly, no refresh needed
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

  // ── Union two record arrays by id; on conflict keep newer (timestamp), else remote ──
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

  // ── Hydrate localStorage from Firestore on every login ──
  //  Array stores are always pulled and merged by id (no record is lost).
  //  Object stores adopt remote only when there is no local copy.
  async function _hydrateFromFirestore(acctKey) {
    // 'invoices' is intentionally excluded — it now lives in its own Firestore
    // collection (accounts/{uid}/invoices/{id}) and is carried over by
    // _migrateInvoicesToCollection() + kept live by _startInvoiceLiveSync().
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
      } catch(e) { /* offline / no Firestore */ }
    }
    for (const kind of objStores) {
      const localKey = 'a3mali_' + kind + '_' + acctKey;
      if (localStorage.getItem(localKey) !== null) continue;  // keep local edits
      try {
        const snap = await getDoc(doc(db, 'accounts/' + acctKey + '/data/' + kind));
        if (!snap.exists()) continue;
        const d = snap.data();
        const payload = (d && d.items !== undefined) ? d.items : d;
        if (payload && typeof payload === 'object') localStorage.setItem(localKey, JSON.stringify(payload));
      } catch(e) { /* offline / no Firestore */ }
    }
  }

  // ── Live sync: keep dashboard data current without a manual refresh ──
  //  Listens for changes the cashier (or another tab/device) pushes to
  //  Firestore — e.g. a new sale — and merges them into localStorage +
  //  the in-memory stores the moment they arrive.
  //  IMPORTANT: this must use the cautious _mergeById merge, NOT adopt the
  //  remote snapshot as-is. Every _fsSync write (cashier checkout, dashboard
  //  edits, etc.) replaces the ENTIRE items array with whatever that
  //  client's local cache currently holds. If a device's local cache is
  //  even slightly stale (e.g. a cashier tab that's been open a while and
  //  missed an update made elsewhere), its next write overwrites Firestore
  //  with a smaller array — silently erasing records it didn't know about.
  //  Treating that incoming snapshot as authoritative here would instantly
  //  propagate that data loss into the dashboard's own local copy too.
  //  _mergeById keeps any record the dashboard already has even if the
  //  incoming snapshot is missing it, so a stale push from elsewhere can't
  //  delete data out from under the admin view.
  //  'invoices' is excluded here — see _startInvoiceLiveSync() below, which
  //  uses a real Firestore collection (one document per invoice) instead of
  //  this single-doc-array pattern, so it can safely reflect deletes too.
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
          if (JSON.stringify(merged) === JSON.stringify(local)) return; // nothing actually new
          localStorage.setItem(localKey, JSON.stringify(merged));
          if (typeof window._onLiveSync === 'function') window._onLiveSync(kind, merged);
        });
      } catch(e) { /* offline / no Firestore */ }
    });
  }

  // ── Invoices: real Firestore collection (accounts/{uid}/invoices/{id}) ──
  //  One document per invoice instead of one big array doc — this is what
  //  actually fixes the data-loss bug: a write only ever touches the ONE
  //  invoice it's about, so a stale client can never overwrite/erase
  //  invoices it doesn't know about. It also means onSnapshot's docChanges()
  //  can correctly and safely report real adds/edits/deletes.
  //  cashier.html's checkout() already writes here via OfflineDB.enqueue();
  //  this is the read/subscribe side for the dashboard.
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

      // Batched writes are capped at 500 ops — chunk defensively.
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
          } else {   // 'added' or 'modified'
            if (idx === -1) window._invoices.unshift(inv);
            else            window._invoices[idx] = inv;
            changed = true;
          }
        });
        if (!changed) return;
        try { localStorage.setItem('a3mali_invoices_' + acctKey, JSON.stringify(window._invoices)); } catch(e) {}
        if (typeof window._onLiveSync === 'function') window._onLiveSync('invoices', window._invoices.slice());
      });
    } catch(e) { /* offline / no Firestore */ }
  }

  // Used by clearAllData()'s danger-zone wipe — _saveData() no longer
  // touches Firestore for invoices, so they must be deleted explicitly.
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

  // ── Auto-backup: write ALL store data to Firestore on every login ──
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
    } catch(e) { /* offline — skip silently */ }
  }

  window.logout = async function() {
    try {
      if (auth) await signOut(auth);
    } catch(e) {}
    sessionStorage.removeItem('a3mali_user');
    window.location.href = 'login.html';
  };

  boot();

  // ===========================
  // APP INITIALIZATION
  // ===========================
  // NOTE: app.js / db.js / router.js / auth.js / i18n.js used to be imported
  // here too, but they're a parallel/unused framework — their bootstrap()
  // is never called and dashboard.html defines its own navigate()/showToast()
  // etc. directly in dash.js. Removed so they stop loading on every page open.
  import { OfflineDB } from './offline.js';

  window.OfflineDB  = OfflineDB;

  window.initDashboard = async function() {
    showLoading(false);

    // All setup is wrapped so a single failure can never block the content render.
    try {
      // Require personal PIN before exposing the dashboard
      if (typeof window.requireDashboardPin === 'function') window.requireDashboardPin();

      // Load user from session
      const userData = JSON.parse(sessionStorage.getItem('a3mali_user') || '{}');
      const initials = (userData.name || 'م').charAt(0);

      const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      // Sidebar bottom shows the SHOP/COMPANY name on top and the registered email below
      const shopName = (window._appSettings && window._appSettings.companyName)
        || userData.companyName || userData.name || userData.email || 'متجري';
      set('user-name',      shopName);
      set('user-role',      userData.email || '—');
      set('user-avatar',    (shopName || 'م').charAt(0));
      set('header-avatar',  initials);
      set('menu-user-name', userData.name || shopName || '');
      set('menu-user-email',userData.email || '');

      // Apply theme
      const theme = localStorage.getItem('a3mali_theme') || 'light';
      applyTheme(theme);
      if (typeof window.updateCurrencyLabel === 'function') window.updateCurrencyLabel();
      if (typeof window.updateSalesBadge   === 'function') window.updateSalesBadge();
      if (typeof window.updateNotifBadge   === 'function') window.updateNotifBadge();

      // Start session timeout if configured
      const _st = parseInt((window._appSettings || {}).sessionTimeout) || 0;
      if (_st > 0 && typeof window._startSessionTimeout === 'function') window._startSessionTimeout(_st);

      // Setup offline listener
      try { OfflineDB.init(); } catch(e) { console.warn('OfflineDB init failed', e); }
      window.addEventListener('online',  () => updateSyncStatus('online'));
      window.addEventListener('offline', () => updateSyncStatus('offline'));
      updateSyncStatus(navigator.onLine ? 'online' : 'offline');
    } catch (err) {
      console.warn('Dashboard setup error (continuing to render):', err);
    }

    // Route to module from hash or default — ALWAYS runs.
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
