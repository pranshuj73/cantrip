import { openDB, type DBSchema, type IDBPDatabase } from "idb";

interface CantripDB extends DBSchema {
  uploadQueue: {
    key: string;
    value: {
      id: string;
      blob: Blob;
      collectionId: string;
      title: string;
      description: string;
      originalSize: number;
      createdAt: number;
      retryCount: number;
    };
    indexes: { "by-created": number };
  };
}

let dbPromise: Promise<IDBPDatabase<CantripDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<CantripDB>("cantrip", 1, {
      upgrade(db) {
        const store = db.createObjectStore("uploadQueue", { keyPath: "id" });
        store.createIndex("by-created", "createdAt");
      },
    });
  }
  return dbPromise;
}

export type { CantripDB };
