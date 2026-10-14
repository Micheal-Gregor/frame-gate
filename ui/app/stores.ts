/**
 * The app's own two stores, kept beside the engine's record. The engine holds a prompt's identity
 * (a digest of its inputs) and a take's height; the app keeps what they stand for - the prompt's
 * inputs and the take's image. Neither store decides anything: a prompt is shown only when its
 * inputs digest back to the identity the engine holds, and an image is shown for the take it was
 * brought in with.
 */
import type { RecordHeight } from "../../src/kernel/index.js";
import type { DrawInputs } from "../../src/condition/index.js";

const PROMPTS = "frame-gate:prompts:v2";
const MEDIA_DB = "frame-gate-media-v2";
const IMAGES = "images";

/** Prompt inputs by the identity the engine holds for them, in this browser's storage. */
export function promptStore() {
  let inputs: Record<string, DrawInputs> = {};
  try {
    inputs = JSON.parse(localStorage.getItem(PROMPTS) ?? "{}") as Record<string, DrawInputs>;
  } catch {
    inputs = {};
  }
  return {
    put: (identity: string, value: DrawInputs): void => {
      inputs[identity] = value;
      try {
        localStorage.setItem(PROMPTS, JSON.stringify(inputs));
      } catch {
        /* storage unavailable: kept for this page only */
      }
    },
    get: (identity: string): DrawInputs | undefined => inputs[identity],
  };
}

const request = <T>(r: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => {
  r.onsuccess = () => resolve(r.result);
  r.onerror = () => reject(r.error);
});

/** Each take's image by the take's height, in this browser's IndexedDB; read once into memory at start. */
export async function mediaStore() {
  const images = new Map<number, string>();
  const db = await new Promise<IDBDatabase | undefined>((resolve) => {
    try {
      const open = indexedDB.open(MEDIA_DB, 1);
      open.onupgradeneeded = () => open.result.createObjectStore(IMAGES);
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
  if (db !== undefined) {
    const store = db.transaction(IMAGES, "readonly").objectStore(IMAGES);
    const [keys, values] = await Promise.all([request(store.getAllKeys()), request(store.getAll())]);
    keys.forEach((k, i) => images.set(Number(k), values[i] as string));
  }
  return {
    get: (take: RecordHeight): string | undefined => images.get(take),
    /** Held in memory at once; written to IndexedDB behind it. */
    put: (take: RecordHeight, image: string): void => {
      images.set(take, image);
      if (db !== undefined) db.transaction(IMAGES, "readwrite").objectStore(IMAGES).put(image, take);
    },
    /** Images are keyed by the take's height, so they belong to one record: a fresh record starts with none. */
    clear: (): void => {
      images.clear();
      if (db !== undefined) db.transaction(IMAGES, "readwrite").objectStore(IMAGES).clear();
    },
  };
}
export type MediaStore = Awaited<ReturnType<typeof mediaStore>>;
export type PromptStore = ReturnType<typeof promptStore>;

/** A brought-in file, made ready: its SHA-256 (recorded with the draw) and a copy sized for the screen. */
export async function prepare(file: File): Promise<{ readonly image: string; readonly sha256: string }> {
  const bytes = await file.arrayBuffer();
  const sha256 = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map((b) => b.toString(16).padStart(2, "0")).join("");
  const bitmap = await createImageBitmap(file);
  const k = Math.min(1, 960 / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * k);
  canvas.height = Math.round(bitmap.height * k);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return { image: canvas.toDataURL("image/jpeg", 0.86), sha256 };
}
