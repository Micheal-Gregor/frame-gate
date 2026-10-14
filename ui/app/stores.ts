/**
 * The app's bindings beside the library: the record port (MOD-02) bound to the record service, and
 * the two stores the service keeps next to it - prompt inputs by the identity the engine holds, and
 * each take's file by the take's height. None of them decides anything.
 *
 * The record port is synchronous, as MOD-02 declares it: an append waits for the service and names
 * the height it expects to land at. If another device acted first, the service refuses it and the
 * append throws StaleRecord - nothing was written - and the caller brings the record up to date.
 */
import { height, type RecordHeight } from "../../src/kernel/index.js";
import type { RecordPort } from "../../src/ports/index.js";
import type { DrawInputs } from "../../src/condition/index.js";

const HEADERS = { "x-review-theater": "1", "Content-Type": "application/json" } as const;

/** Another device appended first; this append was not written. */
export class StaleRecord extends Error {
  constructor() {
    super("the record moved on");
  }
}

const syncRequest = (method: string, url: string, payload?: string): XMLHttpRequest => {
  const xhr = new XMLHttpRequest();
  xhr.open(method, url, false);
  for (const [k, v] of Object.entries(HEADERS)) xhr.setRequestHeader(k, v);
  xhr.send(payload);
  return xhr;
};
const getJson = async <T>(url: string): Promise<T> => {
  const r = await fetch(url, { headers: HEADERS });
  if (r.status === 401) {
    location.reload();
    throw new Error("sign in");
  }
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return (await r.json()) as T;
};

export async function connect() {
  const [{ facts }, inputs, files] = await Promise.all([
    getJson<{ facts: unknown[] }>("/api/record"),
    getJson<Record<string, DrawInputs>>("/api/prompts"),
    getJson<readonly { readonly height: number; readonly type: string; readonly name?: string }[]>("/api/media"),
  ]);

  const record: RecordPort<unknown, RecordHeight> & {
    readonly top: () => RecordHeight;
    readonly empty: () => boolean;
    readonly refresh: () => Promise<number>;
  } = {
    append: (fact: unknown): RecordHeight => {
      const xhr = syncRequest("POST", "/api/record", JSON.stringify({ expected: facts.length, fact }));
      if (xhr.status === 409) throw new StaleRecord();
      if (xhr.status !== 200) throw new Error(`the record service answered ${xhr.status}`);
      facts.push(fact);
      return height(facts.length);
    },
    readAsOf: (at: RecordHeight): readonly unknown[] => facts.slice(0, at),
    top: (): RecordHeight => height(facts.length),
    empty: (): boolean => facts.length === 0,
    /** Bring this device up to date: the facts other devices appended since. Returns how many arrived. */
    refresh: async (): Promise<number> => {
      const r = await getJson<{ facts: unknown[] }>(`/api/record?from=${facts.length}`);
      facts.push(...r.facts);
      return r.facts.length;
    },
  };

  const prompts = {
    put: (identity: string, value: DrawInputs): void => {
      const xhr = syncRequest("PUT", `/api/prompts/${encodeURIComponent(identity)}`, JSON.stringify(value));
      if (xhr.status !== 200) throw new Error(`the record service answered ${xhr.status}`);
      inputs[identity] = value;
    },
    get: (identity: string): DrawInputs | undefined => inputs[identity],
  };

  const kinds = new Map<number, string>(files.map((f) => [f.height, f.type]));
  const names = new Map<number, string>(files.flatMap((f) => (f.name === undefined ? [] : [[f.height, f.name] as const])));
  const local = new Map<number, string>();
  const media = {
    /** Where to show a take's file from: this device's copy while it uploads, then the service. */
    url: (take: RecordHeight): string | undefined => local.get(take) ?? (kinds.has(take) ? `/api/media/${take}` : undefined),
    isVideo: (take: RecordHeight): boolean => (kinds.get(take) ?? "").startsWith("video/"),
    /** The name the file was brought in under. */
    name: (take: RecordHeight): string | undefined => names.get(take),
    put: (take: RecordHeight, file: Blob, name: string): Promise<void> => {
      kinds.set(take, file.type);
      names.set(take, name);
      local.set(take, URL.createObjectURL(file));
      const headers = { "x-review-theater": "1", "x-file-name": encodeURIComponent(name), "Content-Type": file.type || "application/octet-stream" };
      return fetch(`/api/media/${take}`, { method: "PUT", headers, body: file }).then(() => undefined);
    },
  };

  const status = (): Promise<{ readonly height: number; readonly devices: readonly string[] }> => getJson("/api/status");
  return { record, prompts, media, status };
}
export type Connection = Awaited<ReturnType<typeof connect>>;
export type MediaStore = Connection["media"];
export type PromptStore = Connection["prompts"];

/** A file brought in, made ready: its SHA-256 (recorded with the draw), and what to keep - a picture sized for the screen, a clip as it is. */
export async function prepare(file: File): Promise<{ readonly blob: Blob; readonly sha256: string }> {
  const bytes = await file.arrayBuffer();
  const sha256 = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (file.type.startsWith("video/")) return { blob: file, sha256 };
  const bitmap = await createImageBitmap(file);
  const k = Math.min(1, 1600 / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * k);
  canvas.height = Math.round(bitmap.height * k);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b === null ? reject(new Error("unreadable")) : resolve(b)), "image/jpeg", 0.88));
  return { blob, sha256 };
}
