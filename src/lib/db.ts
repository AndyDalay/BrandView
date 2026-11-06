// Almacenamiento local (IndexedDB) de los manuales subidos desde la galería.
const DB_NAME = 'grandbrandview';
const STORE = 'manuales';

export interface StoredPage {
  blob: Blob;
  w: number;
  h: number;
}

export interface StoredManual {
  id: string;
  nombre: string;
  createdAt: number;
  paginas: StoredPage[]; // portada, páginas interiores y contraportada, en orden
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveManual(m: StoredManual): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(m);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function deleteManual(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function listManuals(): Promise<StoredManual[]> {
  const db = await openDb();
  const all = await new Promise<StoredManual[]>((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as StoredManual[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return all;
}
