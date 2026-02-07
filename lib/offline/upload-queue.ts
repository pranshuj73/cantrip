import { getDB, type CantripDB } from "./db";

type QueueEntry = CantripDB["uploadQueue"]["value"];

export async function addToUploadQueue(entry: Omit<QueueEntry, "id" | "createdAt" | "retryCount">) {
  const db = await getDB();
  const item: QueueEntry = {
    ...entry,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    retryCount: 0,
  };
  await db.add("uploadQueue", item);
  return item.id;
}

export async function getUploadQueue(): Promise<QueueEntry[]> {
  const db = await getDB();
  return db.getAllFromIndex("uploadQueue", "by-created");
}

export async function removeFromQueue(id: string) {
  const db = await getDB();
  await db.delete("uploadQueue", id);
}

export async function getQueueCount(): Promise<number> {
  const db = await getDB();
  return db.count("uploadQueue");
}

export async function processQueue(): Promise<number> {
  const queue = await getUploadQueue();
  let synced = 0;

  for (const entry of queue) {
    try {
      const formData = new FormData();
      formData.append("file", entry.blob);
      formData.append("collectionId", entry.collectionId);
      formData.append("title", entry.title);
      formData.append("description", entry.description);
      formData.append("originalSize", String(entry.originalSize));

      const response = await fetch("/api/images/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok || response.status === 409) {
        await removeFromQueue(entry.id);
        synced++;
      } else {
        // Increment retry count, skip for now
        const db = await getDB();
        await db.put("uploadQueue", { ...entry, retryCount: entry.retryCount + 1 });
      }
    } catch {
      // Network error — stop processing, we're probably still offline
      break;
    }
  }

  return synced;
}
