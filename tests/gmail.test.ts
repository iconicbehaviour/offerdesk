import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { randomBytes } from "node:crypto";
import { GmailStore, extractText } from "../server/gmail.ts";

test("Gmail PKCE session validation, encrypted credentials, bounded dedupe and proposal confirmation", async () => {
  const db = new DatabaseSync(":memory:");
  const key = randomBytes(32).toString("base64");
  const calls: string[] = [];
  const fetcher = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push(String(url));
    if (String(url).includes("oauth2.googleapis.com/token")) {
      assert.ok(String(init?.body).includes("code_verifier="));
      return Response.json({ access_token: "secret-access-token", refresh_token: "secret-refresh-token", expires_in: 3600, scope: "https://www.googleapis.com/auth/gmail.readonly" });
    }
    if (String(url).includes("messages?")) {
      const parsed = new URL(String(url));
      assert.equal(parsed.searchParams.get("maxResults"), "100");
      assert.ok(parsed.searchParams.get("q")?.includes("after:"));
      assert.ok(parsed.searchParams.get("q")?.includes("before:"));
      return Response.json({ messages: [{ id: "abc123" }] });
    }
    return Response.json({ internalDate: String(Date.now()), payload: { mimeType: "text/plain", headers: [{ name: "Subject", value: "Acme application received" }, { name: "From", value: "Acme Recruiting <jobs@acme.example>" }], body: { data: Buffer.from("Thank you for applying at Acme.").toString("base64url") } } });
  }) as typeof fetch;
  const store = new GmailStore(db, key, fetcher);
  const config = { clientId: "client", clientSecret: "secret", redirectUri: "http://localhost:3000/api/email/callback" };
  const connection = store.connect("session-a", config.redirectUri, config.clientId);
  const authorization = new URL(connection.url);
  assert.equal(authorization.searchParams.get("scope"), "https://www.googleapis.com/auth/gmail.readonly");
  assert.equal(authorization.searchParams.get("code_challenge_method"), "S256");
  const state = authorization.searchParams.get("state")!;
  await assert.rejects(store.callback("session-b", state, "code", config), /another session/);
  assert.equal(calls.length, 0, "wrong session must fail before exchanging credentials");
  assert.deepEqual(await store.callback("session-a", state, "code", config), { connected: true });
  await assert.rejects(store.callback("session-a", state, "code", config), /invalid/);
  const row = db.prepare("SELECT encrypted FROM gmail_credentials").get() as { encrypted: string };
  assert.ok(!row.encrypted.includes("secret-access-token"));
  assert.ok(!row.encrypted.includes("secret-refresh-token"));
  const encrypted = store.encrypt({ test: "roundtrip" });
  assert.deepEqual(store.decrypt(encrypted), { test: "roundtrip" });
  assert.throws(() => store.decrypt(encrypted.slice(0, -4) + "aaaa"));
  const jobs = [{ id: "j1", company: "Acme", title: "Engineer" }];
  assert.equal((await store.sync(jobs, config)).created, 1);
  assert.equal((await store.sync(jobs, config)).created, 0);
  const updates = store.updates();
  assert.equal(updates.length, 1);
  assert.equal(updates[0].needsReview, true);
  assert.equal(updates[0].jobId, "j1");
  assert.ok(!JSON.stringify(updates).includes("secret-access-token"));
  assert.equal(store.confirm(updates[0].id, "j1").needsReview, false);
  assert.throws(() => store.confirm(updates[0].id, "another"));
  store.disconnect();
  assert.equal(store.connected(), false);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM gmail_oauth_state").get()?.count, 0);
  db.close();
});

test("expired OAuth states and invalid encryption key fail closed", async () => {
  const db = new DatabaseSync(":memory:");
  assert.throws(() => new GmailStore(db, "bad-key"), /32 random bytes/);
  const store = new GmailStore(db, randomBytes(32).toString("base64"), (async () => { throw new Error("must not call"); }) as typeof fetch);
  const config = { clientId: "client", clientSecret: "secret", redirectUri: "http://localhost:3000/api/email/callback" };
  const url = new URL(store.connect("session", config.redirectUri, config.clientId).url);
  db.prepare("UPDATE gmail_oauth_state SET expires_at=0").run();
  await assert.rejects(store.callback("session", url.searchParams.get("state")!, "code", config), /expired/);
  assert.throws(() => store.connect("session", "http://evil.example/callback", "client"), /HTTPS/);
  db.close();
});

test("HTML email content is converted to inert text", () => {
  const value = extractText({ mimeType: "text/html", body: { data: Buffer.from("<script>steal()</script><p>Interview invitation</p>").toString("base64url") } });
  assert.equal(value, "Interview invitation");
});

test("Gmail resumes fixed bounded pages and does not advance failed windows", async () => {
  const db = new DatabaseSync(":memory:");
  let listCalls = 0;
  let failMessage = true;
  const queries: URL[] = [];
  const fetcher = (async (url: string | URL | Request) => {
    const parsed = new URL(String(url));
    if (parsed.pathname.endsWith("/messages")) {
      queries.push(parsed);
      listCalls++;
      if (listCalls === 1) return Response.json({ messages: [], nextPageToken: "page-two" });
      assert.equal(parsed.searchParams.get("pageToken"), "page-two");
      return Response.json({ messages: [{ id: "message2" }] });
    }
    if (failMessage) return Response.json({}, { status: 503 });
    return Response.json({ payload: { mimeType: "text/plain", headers: [{ name: "Subject", value: "Acme application received" }], body: { data: Buffer.from("Thank you for applying at Acme.").toString("base64url") } } });
  }) as typeof fetch;
  const store = new GmailStore(db, randomBytes(32).toString("base64"), fetcher);
  db.prepare("INSERT INTO gmail_credentials VALUES(1,?)").run(store.encrypt({ accessToken: "mock", refreshToken: "mock-refresh", expiresAt: Date.now() + 3600000 }));
  const oldSuccess = Date.now() - 14 * 86400000;
  db.prepare("INSERT INTO gmail_sync_state(id,last_success) VALUES(1,?)").run(oldSuccess);
  const config = { clientId: "client", clientSecret: "secret", redirectUri: "http://localhost:3000/api/email/callback" };
  assert.equal((await store.sync([], config)).truncated, true);
  const first = db.prepare("SELECT * FROM gmail_sync_state").get() as { last_success: number; window_start: number; window_end: number; page_token: string };
  assert.equal(first.last_success, oldSuccess);
  assert.ok(first.window_end - first.window_start <= 7 * 86400000);
  assert.equal(first.page_token, "page-two");
  assert.equal((await store.sync([], config)).errors.length, 1);
  assert.equal(db.prepare("SELECT last_success FROM gmail_sync_state").get()?.last_success, oldSuccess);
  failMessage = false;
  assert.equal((await store.sync([{ id: "job", company: "Acme" }], config)).created, 1);
  assert.equal(queries[0].searchParams.get("q"), queries[1].searchParams.get("q"));
  assert.equal(queries[1].searchParams.get("q"), queries[2].searchParams.get("q"));
  const last = db.prepare("SELECT * FROM gmail_sync_state").get();
  assert.equal(last?.last_success, first.window_end);
  assert.equal(last?.page_token, null);
  db.close();
});
