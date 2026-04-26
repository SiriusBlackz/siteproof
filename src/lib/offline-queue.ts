/**
 * IndexedDB-backed offline capture queue.
 * Stores photos taken without network and auto-uploads when online.
 */

const DB_NAME = "sitefile-offline";
const DB_VERSION = 1;
const STORE_NAME = "capture-queue";

export interface OfflineCapture {
  id: string;
  projectId: string;
  blob: Blob;
  filename: string;
  mimeType: string;
  capturedAt: string;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  note: string;
  taskId: string | null;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
  createdAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function addToQueue(capture: OfflineCapture): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(capture);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getQueue(): Promise<OfflineCapture[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingQueue(): Promise<OfflineCapture[]> {
  const all = await getQueue();
  return all.filter((c) => c.status === "pending");
}

export async function updateQueueItem(
  id: string,
  update: Partial<OfflineCapture>
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => {
      const item = req.result;
      if (item) store.put({ ...item, ...update });
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function removeFromQueue(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearCompleted(): Promise<void> {
  const all = await getQueue();
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    for (const item of all) {
      if (item.status === "done") store.delete(item.id);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function getQueueCount(): Promise<number> {
  return getPendingQueue().then((q) => q.length);
}
