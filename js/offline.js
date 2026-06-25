// ============================================================
//  أعمالي ERP — Offline-First Architecture
//  Uses IndexedDB for local storage + sync queue
// ============================================================

const DB_NAME    = 'a3mali_offline';
const DB_VERSION = 1;

// Store names
const STORES = {
  CACHE:  'cache',   // Cached Firestore data
  QUEUE:  'queue',   // Pending operations to sync
  META:   'meta',    // Metadata (last sync time, etc.)
};

export const OfflineDB = {
  db: null,
  syncing: false,
  listeners: [],

  // ===========================
  // INITIALIZATION
  // ===========================
  async init() {
    try {
      this.db = await this._openDB();
      this._setupNetworkListeners();
      if (navigator.onLine) {
        await this.syncAll();
      }
      console.log('[OfflineDB] Initialized');
    } catch (err) {
      console.error('[OfflineDB] Init error:', err);
    }
  },

  _openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Cache store — keyed by "collection/docId"
        if (!db.objectStoreNames.contains(STORES.CACHE)) {
          const cacheStore = db.createObjectStore(STORES.CACHE, { keyPath: 'key' });
          cacheStore.createIndex('collection', 'collection', { unique: false });
          cacheStore.createIndex('companyId',  'companyId',  { unique: false });
          cacheStore.createIndex('updatedAt',  'updatedAt',  { unique: false });
        }

        // Queue store — auto-increment id
        if (!db.objectStoreNames.contains(STORES.QUEUE)) {
          const queueStore = db.createObjectStore(STORES.QUEUE, { keyPath: 'queueId', autoIncrement: true });
          queueStore.createIndex('type',       'type',       { unique: false });
          queueStore.createIndex('collection', 'collection', { unique: false });
          queueStore.createIndex('status',     'status',     { unique: false });
        }

        // Meta store
        if (!db.objectStoreNames.contains(STORES.META)) {
          db.createObjectStore(STORES.META, { keyPath: 'key' });
        }
      };

      request.onsuccess  = () => resolve(request.result);
      request.onerror    = () => reject(request.error);
    });
  },

  // ===========================
  // CACHE OPERATIONS
  // ===========================

  /**
   * Save document to local cache
   */
  async cacheDoc(collection, docId, data) {
    if (!this.db) return;
    const key = `${collection}/${docId}`;
    return this._put(STORES.CACHE, {
      key,
      collection,
      docId,
      data,
      companyId:  data.companyId || null,
      updatedAt:  Date.now(),
    });
  },

  /**
   * Get document from cache
   */
  async getCachedDoc(collection, docId) {
    if (!this.db) return null;
    const key    = `${collection}/${docId}`;
    const record = await this._get(STORES.CACHE, key);
    return record ? record.data : null;
  },

  /**
   * Query cached collection
   */
  async getCachedCollection(collection, filters = {}) {
    if (!this.db) return [];

    const all = await this._getAllByIndex(STORES.CACHE, 'collection', collection);
    let results = all.map(r => r.data);

    // Apply filters
    if (filters.companyId) {
      results = results.filter(d => d.companyId === filters.companyId);
    }
    if (filters.where) {
      filters.where.forEach(([field, op, value]) => {
        results = results.filter(d => {
          switch(op) {
            case '==': return d[field] === value;
            case '!=': return d[field] !== value;
            case '>':  return d[field] > value;
            case '<':  return d[field] < value;
            case 'in': return Array.isArray(value) && value.includes(d[field]);
            default:   return true;
          }
        });
      });
    }
    if (filters.orderBy) {
      const [field, dir = 'asc'] = filters.orderBy;
      results.sort((a, b) => {
        const av = a[field]; const bv = b[field];
        if (av === bv) return 0;
        const cmp = av < bv ? -1 : 1;
        return dir === 'desc' ? -cmp : cmp;
      });
    }
    if (filters.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  },

  /**
   * Remove document from cache
   */
  async removeCachedDoc(collection, docId) {
    if (!this.db) return;
    return this._delete(STORES.CACHE, `${collection}/${docId}`);
  },

  // ===========================
  // SYNC QUEUE
  // ===========================

  /**
   * Add operation to sync queue
   */
  async enqueue(operation) {
    if (!this.db) return;
    const item = {
      ...operation,
      status:    'pending',
      attempts:  0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const queueId = await this._add(STORES.QUEUE, item);
    console.log(`[OfflineDB] Queued: ${operation.type} → ${operation.collection}`);

    // Try to sync immediately if online
    if (navigator.onLine) {
      this.syncAll();
    }
    return queueId;
  },

  /**
   * Get all pending queue items
   */
  async getPendingQueue() {
    if (!this.db) return [];
    const all = await this._getAllByIndex(STORES.QUEUE, 'status', 'pending');
    return all.sort((a, b) => a.queueId - b.queueId);
  },

  /**
   * Sync all pending operations to Firestore
   */
  async syncAll() {
    if (this.syncing || !navigator.onLine) return;
    const queue = await this.getPendingQueue();
    if (!queue.length) return;

    this.syncing = true;
    this._notifyListeners('syncing');
    console.log(`[OfflineDB] Syncing ${queue.length} queued operations...`);

    const db = window.__db;  // Firestore instance
    if (!db) { this.syncing = false; return; }

    const { doc, setDoc, updateDoc, deleteDoc, collection, serverTimestamp } =
      await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

    let successCount = 0;
    let failCount    = 0;

    for (const item of queue) {
      try {
        const colRef = collection(db, item.collection);

        switch (item.type) {
          case 'INSERT': {
            const docRef = doc(colRef, item.data.id || undefined);
            await setDoc(docRef, {
              ...item.data,
              syncedAt: serverTimestamp(),
            });
            break;
          }
          case 'UPDATE': {
            const docRef = doc(colRef, item.data.id);
            await updateDoc(docRef, {
              ...item.data,
              updatedAt: serverTimestamp(),
            });
            break;
          }
          case 'DELETE': {
            const docRef = doc(colRef, item.docId);
            await deleteDoc(docRef);
            break;
          }
        }

        // Mark as synced
        await this._put(STORES.QUEUE, { ...item, status: 'synced', syncedAt: Date.now() });
        successCount++;

      } catch (err) {
        console.error(`[OfflineDB] Sync failed for item ${item.queueId}:`, err);
        await this._put(STORES.QUEUE, {
          ...item,
          status:   item.attempts >= 3 ? 'failed' : 'pending',
          attempts: item.attempts + 1,
          lastError: err.message,
        });
        failCount++;
      }
    }

    this.syncing = false;
    await this._setMeta('lastSync', Date.now());

    if (successCount > 0) {
      console.log(`[OfflineDB] Synced ${successCount} operations`);
      this._notifyListeners('synced', { successCount, failCount });
      this._showSyncToast(successCount, failCount);
    }
  },

  // ===========================
  // CONFLICT RESOLUTION
  // ===========================

  /**
   * Resolve conflict: local wins (last-write-wins by default)
   * Override this for custom conflict resolution
   */
  resolveConflict(localData, remoteData) {
    const localUpdated  = new Date(localData.updatedAt || 0);
    const remoteUpdated = new Date(remoteData.updatedAt?.toDate?.() || remoteData.updatedAt || 0);

    if (localUpdated > remoteUpdated) {
      return { winner: 'local',  data: localData };
    } else {
      return { winner: 'remote', data: remoteData };
    }
  },

  // ===========================
  // META
  // ===========================
  async _setMeta(key, value) {
    return this._put(STORES.META, { key, value, updatedAt: Date.now() });
  },

  async _getMeta(key) {
    const record = await this._get(STORES.META, key);
    return record ? record.value : null;
  },

  // ===========================
  // NETWORK LISTENERS
  // ===========================
  _setupNetworkListeners() {
    window.addEventListener('online', () => {
      console.log('[OfflineDB] Back online — starting sync');
      this.syncAll();
    });

    window.addEventListener('offline', () => {
      console.log('[OfflineDB] Gone offline');
    });
  },

  // ===========================
  // EVENT SYSTEM
  // ===========================
  onSync(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  },

  _notifyListeners(event, data = {}) {
    this.listeners.forEach(cb => {
      try { cb(event, data); } catch(e) {}
    });
  },

  // ===========================
  // TOAST NOTIFICATION
  // ===========================
  _showSyncToast(success, fail) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'toast toast-success';
    el.innerHTML = `<span class="toast-icon">🔄</span><span class="toast-msg">تمت المزامنة — ${success} عملية تم رفعها بنجاح${fail > 0 ? ` (${fail} فشلت)` : ''}</span>`;
    container.appendChild(el);
    setTimeout(() => { el.classList.add('removing'); setTimeout(() => el.remove(), 300); }, 4000);
  },

  // ===========================
  // STORAGE STATS
  // ===========================
  async getStats() {
    if (!this.db) return { cacheCount: 0, queueCount: 0, lastSync: null };
    const [cacheAll, queueAll, lastSync] = await Promise.all([
      this._getAll(STORES.CACHE),
      this._getAll(STORES.QUEUE),
      this._getMeta('lastSync'),
    ]);
    return {
      cacheCount: cacheAll.length,
      queueCount: queueAll.filter(i => i.status === 'pending').length,
      lastSync:   lastSync ? new Date(lastSync) : null,
    };
  },

  // ===========================
  // INDEXEDDB HELPERS
  // ===========================
  _transaction(storeName, mode = 'readonly') {
    return this.db.transaction([storeName], mode).objectStore(storeName);
  },

  _get(storeName, key) {
    return new Promise((resolve, reject) => {
      const req = this._transaction(storeName).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror   = () => reject(req.error);
    });
  },

  _getAll(storeName) {
    return new Promise((resolve, reject) => {
      const req = this._transaction(storeName).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror   = () => reject(req.error);
    });
  },

  _getAllByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
      const store = this._transaction(storeName);
      const index = store.index(indexName);
      const req   = index.getAll(value);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror   = () => reject(req.error);
    });
  },

  _add(storeName, data) {
    return new Promise((resolve, reject) => {
      const req = this._transaction(storeName, 'readwrite').add(data);
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  },

  _put(storeName, data) {
    return new Promise((resolve, reject) => {
      const req = this._transaction(storeName, 'readwrite').put(data);
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  },

  _delete(storeName, key) {
    return new Promise((resolve, reject) => {
      const req = this._transaction(storeName, 'readwrite').delete(key);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  },
};

export default OfflineDB;
