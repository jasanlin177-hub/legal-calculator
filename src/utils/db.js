const DB_NAME = 'legal-calculator-db';
const DB_VERSION = 1;
const STORE_NAME = 'cases';

let _db = null;

const openDB = () => {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    req.onsuccess = e => { _db = e.target.result; resolve(_db); };
    req.onerror = e => reject(e.target.error);
  });
};

export const saveCase = async (caseSession) => {
  if (!caseSession?.id) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ ...caseSession, updatedAt: new Date().toISOString() });
    tx.oncomplete = resolve;
    tx.onerror = e => reject(e.target.error);
  });
};

export const loadCase = async (id) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(id);
    req.onsuccess = e => resolve(e.target.result ?? null);
    req.onerror = e => reject(e.target.error);
  });
};

export const listCases = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const results = [];
    const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).openCursor();
    req.onsuccess = e => {
      const cursor = e.target.result;
      if (cursor) {
        const { id, caseCause, createdAt, updatedAt, suspects } = cursor.value;
        results.push({
          id,
          caseCause: caseCause || '（無案由）',
          createdAt,
          updatedAt,
          suspectCount: suspects?.length ?? 0,
          firstSuspectName: suspects?.[0]?.suspectName || ''
        });
        cursor.continue();
      } else {
        results.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
        resolve(results);
      }
    };
    req.onerror = e => reject(e.target.error);
  });
};

export const deleteCase = async (id) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = e => reject(e.target.error);
  });
};
