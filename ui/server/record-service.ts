/**
 * The Review Theater's record service (Build batch 4, candidate A): one record for every device.
 *
 * Runs inside the dev server. It keeps the engine's append-only record, the prompt inputs and the
 * take media in a folder OUTSIDE the project tree (local app data - not synced, not in git), and
 * appends in one order: an append names the height it expects to land at, and is refused if the
 * record has moved on (another device acted first), so no two devices ever disagree about a height.
 * It decides nothing about the scene - the library does that, in each browser.
 *
 * Beside the record it notes when each fact arrived (a clock time per height - the engine orders by
 * height only), and once a day copies the record, prompts, times and files into a dated folder of
 * backups (FRAME_GATE_BACKUP, else "Review Theater backups" in the personal OneDrive), keeping 14.
 *
 * Access: requests from this computer are let in. Any other device must sign in with the access
 * code first - for every page and file, not just the record. The code is FRAME_GATE_CODE when set;
 * otherwise one is generated once and kept in the data folder, never in the project.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cpSync, createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { homedir, networkInterfaces } from "node:os";
import { join } from "node:path";
import type { Plugin } from "vite";

const DIR = join(process.env["LOCALAPPDATA"] ?? join(homedir(), ".local", "share"), "frame-gate", "review-theater");
const MEDIA = join(DIR, "media");
const SESSION = "fg_session";
const ONEDRIVE = process.env["OneDriveConsumer"];
const BACKUPS = process.env["FRAME_GATE_BACKUP"] ?? (ONEDRIVE === undefined ? undefined : join(ONEDRIVE, "Review Theater backups"));
const KEEP = 14;
const DATED = /^\d{4}-\d{2}-\d{2}$/;

const readJson = <T>(file: string, fallback: T): T => {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
};
/** Written whole to a temporary file, then renamed over the old one: a crash never leaves half a record. */
const writeJson = (file: string, value: unknown): void => {
  writeFileSync(`${file}.tmp`, JSON.stringify(value));
  renameSync(`${file}.tmp`, file);
};
const isLocal = (req: IncomingMessage): boolean => ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress ?? "");
const body = (req: IncomingMessage): Promise<Buffer> => new Promise((resolve, reject) => {
  const chunks: Buffer[] = [];
  req.on("data", (c: Buffer) => chunks.push(c));
  req.on("end", () => resolve(Buffer.concat(chunks)));
  req.on("error", reject);
});
const send = (res: ServerResponse, status: number, value: unknown): void => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(value));
};
const cookie = (req: IncomingMessage, name: string): string | undefined =>
  (req.headers.cookie ?? "").split(";").map((c) => c.trim().split("=")).find(([k]) => k === name)?.[1];
const device = (req: IncomingMessage): string => {
  const ua = req.headers["user-agent"] ?? "";
  return /iPad/.test(ua) ? "an iPad" : /iPhone/.test(ua) ? "an iPhone" : /Android/.test(ua) ? (/Mobile/.test(ua) ? "an Android phone" : "an Android tablet") : /Macintosh/.test(ua) ? "a Mac" : /Windows/.test(ua) ? "a Windows computer" : "a device";
};

const SIGN_IN = (failed: boolean): string => `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Review Theater - sign in</title>
<style>body{margin:0;font:15px/1.45 system-ui,sans-serif;background:#f6f5f2;color:#1d1d1f;display:grid;place-items:center;min-height:100vh}form{background:#fff;border:1px solid #e2e0da;border-radius:10px;padding:22px;width:min(340px,90vw);display:grid;gap:10px}input,button{font:inherit;padding:10px;border-radius:7px;border:1px solid #c9c7c0}button{background:#2f5bd3;color:#fff;border-color:#2f5bd3}.no{color:#b42318}</style></head>
<body><form method="post" action="/api/session"><b>Review Theater</b><span>This scene's record is on another computer. Enter the access code to open it on this device.</span>${failed ? `<span class="no">That code didn't match.</span>` : ""}<input name="code" type="password" autocomplete="current-password" placeholder="access code" autofocus /><button>Open the record</button></form></body></html>`;

export function recordService(): Plugin {
  mkdirSync(MEDIA, { recursive: true });
  const recordFile = join(DIR, "record.json");
  const promptsFile = join(DIR, "prompts.json");
  const sessionsFile = join(DIR, "sessions.json");
  const codeFile = join(DIR, "access-code.txt");
  const timesFile = join(DIR, "times.json");
  const facts = readJson<unknown[]>(recordFile, []);
  /** When each fact arrived, by height (index + 1); facts from before times were kept have none. */
  const times = readJson<(number | null)[]>(timesFile, []);
  while (times.length < facts.length) times.unshift(null);
  const prompts = readJson<Record<string, unknown>>(promptsFile, {});
  /** Session tokens are kept as digests, so the file never holds a usable token. */
  const sessions = new Set(readJson<string[]>(sessionsFile, []));
  const seen = new Map<string, number>();
  if (process.env["FRAME_GATE_CODE"] === undefined && !existsSync(codeFile)) writeFileSync(codeFile, randomBytes(9).toString("base64url"));
  const code = (process.env["FRAME_GATE_CODE"] ?? readFileSync(codeFile, "utf8")).trim();
  const digest = (token: string): string => createHash("sha256").update(token).digest("hex");
  const signedIn = (req: IncomingMessage): boolean => isLocal(req) || sessions.has(digest(cookie(req, SESSION) ?? ""));

  /** One dated copy a day, after 2 a.m.; the oldest beyond KEEP removed - only dated folders inside the backups folder. */
  const copies = (): string[] => (BACKUPS === undefined || !existsSync(BACKUPS) ? [] : readdirSync(BACKUPS).filter((d) => DATED.test(d)).sort());
  const backUp = (): void => {
    if (BACKUPS === undefined) return;
    const now = new Date();
    const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    if (now.getHours() < 2 || copies().includes(day)) return;
    const target = join(BACKUPS, day);
    mkdirSync(target, { recursive: true });
    for (const f of ["record.json", "prompts.json", "times.json"]) if (existsSync(join(DIR, f))) cpSync(join(DIR, f), join(target, f));
    cpSync(MEDIA, join(target, "media"), { recursive: true });
    for (const old of copies().slice(0, Math.max(0, copies().length - KEEP))) rmSync(join(BACKUPS, old), { recursive: true, force: true });
  };
  try {
    backUp();
  } catch {
    /* a failed copy is reported by status (no new dated folder), never fatal */
  }
  setInterval(() => {
    try {
      backUp();
    } catch {
      /* as above */
    }
  }, 30 * 60_000).unref();
  const addresses = (port: number): string[] =>
    Object.values(networkInterfaces()).flat().filter((a) => a !== undefined && a.family === "IPv4" && !a.internal).map((a) => `http://${a?.address}:${port}`);

  return {
    name: "review-theater-record",
    configureServer(server) {
      server.config.logger.info(`\n  Review Theater record: ${DIR}\n  Other devices sign in with the access code in ${process.env["FRAME_GATE_CODE"] ? "FRAME_GATE_CODE" : codeFile}\n`);
      // Registered before Vite's own middleware: nothing - page, file or record - reaches another device unsigned.
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? "/", "http://local");
        if (url.pathname === "/api/session" && req.method === "POST") {
          const given = new URLSearchParams((await body(req)).toString()).get("code") ?? "";
          const a = createHash("sha256").update(given).digest();
          const b = createHash("sha256").update(code).digest();
          if (!timingSafeEqual(a, b)) {
            await new Promise((r) => setTimeout(r, 800));
            res.statusCode = 401;
            res.setHeader("Content-Type", "text/html");
            return res.end(SIGN_IN(true));
          }
          const token = randomBytes(24).toString("base64url");
          sessions.add(digest(token));
          writeJson(sessionsFile, [...sessions]);
          res.statusCode = 303;
          res.setHeader("Set-Cookie", `${SESSION}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000`);
          res.setHeader("Location", "/index.html");
          return res.end();
        }
        if (!signedIn(req)) {
          if (url.pathname.startsWith("/api/")) return send(res, 401, { error: "sign in" });
          res.statusCode = 401;
          res.setHeader("Content-Type", "text/html");
          return res.end(SIGN_IN(false));
        }
        if (!url.pathname.startsWith("/api/")) return next();
        // A web page elsewhere in this computer's browser can send a plain POST to localhost; a custom
        // header cannot be sent cross-site without a CORS preflight this service never grants.
        if (req.method !== "GET" && (req.headers["x-review-theater"] !== "1" || (req.headers.origin !== undefined && new URL(req.headers.origin).host !== req.headers.host))) {
          return send(res, 403, { error: "not from the Review Theater" });
        }
        seen.set(isLocal(req) ? "the host computer" : device(req), Date.now());

        // ---- the record: read whole, or from a height; append at the height expected
        if (url.pathname === "/api/record" && req.method === "GET") {
          const from = Number(url.searchParams.get("from") ?? 0);
          return send(res, 200, { height: facts.length, facts: facts.slice(from), times: times.slice(from) });
        }
        if (url.pathname === "/api/record" && req.method === "POST") {
          const { expected, fact } = JSON.parse((await body(req)).toString()) as { expected: number; fact: unknown };
          if (expected !== facts.length) return send(res, 409, { height: facts.length });
          facts.push(fact);
          times.push(Date.now());
          writeJson(recordFile, facts);
          writeJson(timesFile, times);
          return send(res, 200, { height: facts.length });
        }
        if (url.pathname === "/api/status") {
          const devices = [...seen].filter(([, t]) => Date.now() - t < 10 * 60_000).map(([d]) => d);
          const kept = copies();
          return send(res, 200, {
            height: facts.length,
            devices,
            addresses: addresses(server.config.server.port ?? 5173),
            codeAt: process.env["FRAME_GATE_CODE"] ? "the FRAME_GATE_CODE setting on the host computer" : codeFile,
            backups: { folder: BACKUPS ?? null, last: kept.at(-1) ?? null, kept: kept.length, keep: KEEP },
          });
        }
        // ---- prompt inputs by identity
        if (url.pathname === "/api/prompts" && req.method === "GET") return send(res, 200, prompts);
        if (url.pathname.startsWith("/api/prompts/") && req.method === "PUT") {
          prompts[decodeURIComponent(url.pathname.slice("/api/prompts/".length))] = JSON.parse((await body(req)).toString());
          writeJson(promptsFile, prompts);
          return send(res, 200, { ok: true });
        }
        // ---- media by take height: the file as brought in (resized pictures, clips as they are)
        if (url.pathname === "/api/media" && req.method === "GET") {
          return send(res, 200, readdirSync(MEDIA).filter((f) => f.endsWith(".type")).map((f) => {
            const h = f.slice(0, -5);
            return { height: Number(h), type: readFileSync(join(MEDIA, f), "utf8"), name: existsSync(join(MEDIA, `${h}.name`)) ? readFileSync(join(MEDIA, `${h}.name`), "utf8") : undefined };
          }));
        }
        const m = /^\/api\/media\/(\d+)$/.exec(url.pathname);
        if (m !== null) {
          const file = join(MEDIA, m[1] as string);
          if (req.method === "PUT") {
            writeFileSync(`${file}.bin`, await body(req));
            writeFileSync(`${file}.type`, req.headers["content-type"] ?? "application/octet-stream");
            const name = req.headers["x-file-name"];
            if (typeof name === "string") writeFileSync(`${file}.name`, decodeURIComponent(name));
            return send(res, 200, { ok: true });
          }
          if (!existsSync(`${file}.type`)) return send(res, 404, { error: "no media" });
          res.setHeader("Content-Type", readFileSync(`${file}.type`, "utf8"));
          res.setHeader("Cache-Control", "private, max-age=31536000, immutable");
          return createReadStream(`${file}.bin`).pipe(res);
        }
        return send(res, 404, { error: "no such route" });
      });
    },
  };
}
