import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { parseEmail } from "./agent-engine.ts";

export type GmailConfig = { clientId: string; clientSecret: string; redirectUri: string };
export type GmailJob = { id: string; company: string; title?: string };
export type GmailUpdate = { id: string; providerId: string; company: string; subject: string; from: string; receivedAt: string; status: string; evidence: string; confidence: string; candidateJobIds: string[]; jobId: string | null; needsReview: boolean; confirmedAt: string | null };
type Tokens = { accessToken: string; refreshToken: string; expiresAt: number };
type MessagePart = { mimeType?: string; body?: { data?: string }; parts?: MessagePart[] };
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const random = () => randomBytes(32).toString("base64url");
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export class GmailStore {
  private db: DatabaseSync;
  private key: Buffer;
  private fetcher: typeof fetch;

  constructor(db: DatabaseSync, encryptionKey: string, fetcher: typeof fetch = fetch) {
    this.db = db;
    this.key = Buffer.from(encryptionKey, "base64");
    if (this.key.length !== 32) throw new Error("ENCRYPTION_KEY must encode exactly 32 random bytes as base64.");
    this.fetcher = fetcher;
    db.exec(`CREATE TABLE IF NOT EXISTS gmail_oauth_state (state_hash TEXT PRIMARY KEY, session_hash TEXT NOT NULL, verifier TEXT NOT NULL, redirect_uri TEXT NOT NULL, expires_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS gmail_credentials (id INTEGER PRIMARY KEY CHECK(id=1), encrypted TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS gmail_updates (provider_id TEXT PRIMARY KEY, proposal_json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS gmail_sync_state (id INTEGER PRIMARY KEY CHECK(id=1), last_success INTEGER, window_start INTEGER, window_end INTEGER, page_token TEXT);`);
  }

  encrypt(value: unknown) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
    return [iv, cipher.getAuthTag(), ciphertext].map(item => item.toString("base64")).join(".");
  }

  decrypt(value: string): unknown {
    const [iv, tag, ciphertext] = value.split(".").map(item => Buffer.from(item, "base64"));
    if (!iv || !tag || !ciphertext || iv.length !== 12 || tag.length !== 16) throw new Error("Invalid encrypted credential.");
    const decipher = createDecipheriv("aes-256-gcm", this.key, iv);
    decipher.setAuthTag(tag);
    return JSON.parse(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8"));
  }

  connected() { return !!this.db.prepare("SELECT id FROM gmail_credentials WHERE id=1").get(); }

  connect(sessionId: string, redirectUri: string, clientId: string) {
    if (!sessionId || !clientId) throw new Error("Sign in and configure Google OAuth before connecting Gmail.");
    const parsed = new URL(redirectUri);
    if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname))) throw new Error("OAuth redirect must use HTTPS or loopback HTTP.");
    const state = random();
    const verifier = randomBytes(48).toString("base64url");
    this.db.prepare("DELETE FROM gmail_oauth_state WHERE expires_at < ? OR session_hash = ?").run(Date.now(), hash(sessionId));
    this.db.prepare("INSERT INTO gmail_oauth_state(state_hash,session_hash,verifier,redirect_uri,expires_at) VALUES(?,?,?,?,?)").run(hash(state), hash(sessionId), verifier, redirectUri, Date.now() + 600000);
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: "code", scope: "https://www.googleapis.com/auth/gmail.readonly", access_type: "offline", prompt: "consent", state, code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256" }).toString();
    return { url: url.toString() };
  }

  async callback(sessionId: string, state: string, code: string, config: GmailConfig) {
    if (!sessionId || !state || !code) throw new Error("OAuth callback is missing its session, state or code.");
    const row = this.db.prepare("SELECT * FROM gmail_oauth_state WHERE state_hash=?").get(hash(state)) as { session_hash: string; verifier: string; redirect_uri: string; expires_at: number } | undefined;
    if (!row || row.session_hash !== hash(sessionId) || row.expires_at < Date.now() || row.redirect_uri !== config.redirectUri) throw new Error("OAuth state is invalid, expired or belongs to another session.");
    // Consume before exchanging: callback retries must start a new authorization.
    this.db.prepare("DELETE FROM gmail_oauth_state WHERE state_hash=?").run(hash(state));
    const response = await this.fetcher("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: config.redirectUri, grant_type: "authorization_code", code_verifier: row.verifier }), signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`Google OAuth exchange failed (${response.status}). Reconnect Gmail.`);
    const value = await response.json() as Record<string, unknown>;
    if (typeof value.access_token !== "string" || !value.access_token || typeof value.refresh_token !== "string" || !value.refresh_token) throw new Error("Google did not provide persistent credentials. Reconnect with offline consent.");
    if (typeof value.scope === "string" && !value.scope.split(" ").includes("https://www.googleapis.com/auth/gmail.readonly")) throw new Error("Gmail read-only consent was not granted.");
    this.saveTokens({ accessToken: value.access_token, refreshToken: value.refresh_token, expiresAt: Date.now() + (typeof value.expires_in === "number" ? value.expires_in : 3600) * 1000 });
    return { connected: true as const };
  }

  private saveTokens(tokens: Tokens) { this.db.prepare("INSERT INTO gmail_credentials(id,encrypted) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET encrypted=excluded.encrypted").run(this.encrypt(tokens)); }
  private async accessToken(config: GmailConfig) {
    const row = this.db.prepare("SELECT encrypted FROM gmail_credentials WHERE id=1").get() as { encrypted: string } | undefined;
    if (!row) throw new Error("Gmail is not connected.");
    const tokens = this.decrypt(row.encrypted) as Tokens;
    if (tokens.expiresAt > Date.now() + 60000) return tokens.accessToken;
    const response = await this.fetcher("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, refresh_token: tokens.refreshToken, grant_type: "refresh_token" }), signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`Gmail credential refresh failed (${response.status}). Reconnect Gmail.`);
    const value = await response.json() as Record<string, unknown>;
    if (typeof value.access_token !== "string" || !value.access_token) throw new Error("Google returned no access token.");
    this.saveTokens({ accessToken: value.access_token, refreshToken: typeof value.refresh_token === "string" ? value.refresh_token : tokens.refreshToken, expiresAt: Date.now() + (typeof value.expires_in === "number" ? value.expires_in : 3600) * 1000 });
    return value.access_token;
  }

  async sync(jobs: GmailJob[], config: GmailConfig) {
    const token = await this.accessToken(config);
    const headers = { Authorization: `Bearer ${token}` };
    const cursor = this.db.prepare("SELECT last_success,window_start,window_end,page_token FROM gmail_sync_state WHERE id=1").get() as { last_success: number | null; window_start: number | null; window_end: number | null; page_token: string | null } | undefined;
    const now = Date.now();
    const windowEnd = cursor?.window_end ?? now;
    const windowStart = cursor?.window_start ?? Math.max(now - 7 * 86400000, (cursor?.last_success ?? now - 86400000) - 300000);
    // Persist the fixed window before reads. Overflow pages resume against the same
    // bounded search, rather than repeatedly reading only the newest 100 messages.
    this.db.prepare("INSERT INTO gmail_sync_state(id,last_success,window_start,window_end,page_token) VALUES(1,?,?,?,?) ON CONFLICT(id) DO UPDATE SET window_start=excluded.window_start,window_end=excluded.window_end").run(cursor?.last_success ?? null, windowStart, windowEnd, cursor?.page_token ?? null);
    const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
    const query = new URLSearchParams({ maxResults: "100", q: `after:${Math.floor(windowStart / 1000)} before:${Math.ceil(windowEnd / 1000)} ("application" OR "interview" OR "offer" OR "applying" OR "recruiter")` });
    if (cursor?.page_token) query.set("pageToken", cursor.page_token);
    listUrl.search = query.toString();
    const list = await this.fetcher(listUrl, { headers, signal: AbortSignal.timeout(20000) });
    if (!list.ok) throw new Error(`Gmail message search failed (${list.status}).`);
    const result = await list.json() as { messages?: { id: string }[]; nextPageToken?: string };
    const messages = Array.isArray(result.messages) ? result.messages.slice(0, 100) : [];
    let created = 0;
    const errors: string[] = [];
    const deadline = Date.now() + 55000;
    // Sequential bounded reads avoid bursts and make partial progress durable.
    for (const message of messages) {
      if (Date.now() >= deadline) { errors.push("Gmail refresh reached its time budget. Unprocessed messages can be picked up on the next refresh."); break; }
      if (typeof message.id !== "string" || !/^[a-zA-Z0-9_-]+$/.test(message.id)) continue;
      if (this.db.prepare("SELECT provider_id FROM gmail_updates WHERE provider_id=?").get(message.id)) continue;
      try {
        const response = await this.fetcher(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(message.id)}?format=full`, { headers, signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error(`Message read failed (${response.status}).`);
        const data = await response.json() as { payload?: MessagePart & { headers?: { name: string; value: string }[] }; internalDate?: string; snippet?: string };
        const header = (name: string) => data.payload?.headers?.find(item => item.name.toLowerCase() === name)?.value?.slice(0, 1000) ?? "";
        const subject = header("subject");
        const from = header("from");
        const body = extractText(data.payload).slice(0, 30000) || data.snippet?.slice(0, 30000) || "";
        const normalized = ` ${normalize(`${subject} ${from} ${body}`)} `;
        const candidates = jobs.filter(job => job.company.trim() && normalized.includes(` ${normalize(job.company)} `));
        const companies = [...new Set(candidates.map(job => job.company))];
        const company = companies.length === 1 ? companies[0] : "Unmatched company";
        const parsed = parseEmail(`${subject}\n${body}`, company === "Unmatched company" ? "" : company);
        const proposal: GmailUpdate = { id: `gmail-${message.id}`, providerId: message.id, company, subject, from, receivedAt: Number.isFinite(Number(data.internalDate)) && data.internalDate ? new Date(Number(data.internalDate)).toISOString() : new Date().toISOString(), status: parsed.status, evidence: parsed.evidence.slice(0, 1000), confidence: companies.length === 1 ? parsed.confidence : "low", candidateJobIds: candidates.map(job => job.id), jobId: candidates.length === 1 ? candidates[0].id : null, needsReview: true, confirmedAt: null };
        this.db.prepare("INSERT OR IGNORE INTO gmail_updates(provider_id,proposal_json) VALUES(?,?)").run(message.id, JSON.stringify(proposal));
        created++;
      } catch (error) { errors.push(error instanceof Error ? error.message : "Message could not be read."); }
    }
    if (!errors.length) {
      if (typeof result.nextPageToken === "string" && result.nextPageToken) this.db.prepare("UPDATE gmail_sync_state SET page_token=? WHERE id=1").run(result.nextPageToken);
      else this.db.prepare("UPDATE gmail_sync_state SET last_success=?,window_start=NULL,window_end=NULL,page_token=NULL WHERE id=1").run(windowEnd);
    }
    // On errors, retain this page/window; already persisted proposals deduplicate
    // on retry. The success watermark advances only after the window is exhausted.
    return { fetched: messages.length, created, errors, truncated: !!result.nextPageToken };
  }

  updates(): GmailUpdate[] { return (this.db.prepare("SELECT proposal_json FROM gmail_updates ORDER BY rowid DESC LIMIT 200").all() as { proposal_json: string }[]).map(row => JSON.parse(row.proposal_json)); }
  confirm(id: string, jobId: string): GmailUpdate {
    const row = this.db.prepare("SELECT provider_id,proposal_json FROM gmail_updates WHERE provider_id=?").get(id.startsWith("gmail-") ? id.slice(6) : id) as { provider_id: string; proposal_json: string } | undefined;
    if (!row) throw new Error("Email update not found.");
    const update = JSON.parse(row.proposal_json) as GmailUpdate;
    if (!jobId) throw new Error("Choose an application before confirming.");
    if (update.candidateJobIds.length && !update.candidateJobIds.includes(jobId)) throw new Error("This application is not among the email's company matches.");
    if (update.confirmedAt) { if (update.jobId !== jobId) throw new Error("This update was already confirmed for another application."); return update; }
    const confirmed = { ...update, jobId, needsReview: false, confirmedAt: new Date().toISOString() };
    this.db.prepare("UPDATE gmail_updates SET proposal_json=? WHERE provider_id=?").run(JSON.stringify(confirmed), row.provider_id);
    return confirmed;
  }
  disconnect() { this.db.exec("DELETE FROM gmail_credentials; DELETE FROM gmail_oauth_state; DELETE FROM gmail_sync_state;"); }
}

export function extractText(part?: MessagePart, depth = 0): string {
  if (!part || depth > 12) return "";
  if (part.mimeType === "text/plain" && typeof part.body?.data === "string") return Buffer.from(part.body.data.slice(0, 100000), "base64url").toString("utf8");
  if (part.parts) return part.parts.slice(0, 30).map(child => extractText(child, depth + 1)).filter(Boolean).join("\n").slice(0, 30000);
  // HTML is stripped to inert text and never rendered as markup.
  if (part.mimeType === "text/html" && typeof part.body?.data === "string") return Buffer.from(part.body.data.slice(0, 100000), "base64url").toString("utf8").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return "";
}
