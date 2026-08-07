/**
 * Minimal promisified IndexedDB access (task 09). Two stores:
 * "drafts" (keyPath id) and "brand" (single "kit" entry).
 */
const DB_NAME = "insta-studio";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("drafts")) {
          db.createObjectStore("drafts", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("brand")) {
          db.createObjectStore("brand");
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error("IndexedDB nicht verfügbar"));
    });
  }
  return dbPromise;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function idbPut(
  store: string,
  value: unknown,
  key?: IDBValidKey,
): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(store, "readwrite");
  await requestToPromise(tx.objectStore(store).put(value, key));
}

export async function idbGet<T>(
  store: string,
  key: IDBValidKey,
): Promise<T | undefined> {
  const db = await openDb();
  const tx = db.transaction(store, "readonly");
  return requestToPromise(tx.objectStore(store).get(key) as IDBRequest<T>);
}

export async function idbGetAll<T>(store: string): Promise<T[]> {
  const db = await openDb();
  const tx = db.transaction(store, "readonly");
  return requestToPromise(tx.objectStore(store).getAll() as IDBRequest<T[]>);
}

export async function idbDelete(
  store: string,
  key: IDBValidKey,
): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(store, "readwrite");
  await requestToPromise(tx.objectStore(store).delete(key));
}
