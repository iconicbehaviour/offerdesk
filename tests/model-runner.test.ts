// Run: node --experimental-strip-types tests/model-runner.test.ts
import assert from "node:assert/strict";

import { profileEvidence, runModelAgents, validateProposal } from "../server/model-runner.ts";

const evidence = profileEvidence("TEST CANDIDATE\n• Built API integrations.\nDRAFT CHECK: verify dates");
assert.equal(evidence.length, 2);
assert.equal(evidence[1].id, "profile-line-002");
assert.throws(() => validateProposal({ resume: "Invented", answers: [], evidenceIds: ["fake-id"], notes: [] }, evidence), /unknown evidence/);
assert.throws(() => validateProposal({ resume: "No citations", answers: [], evidenceIds: [], notes: [] }, evidence), /must cite/);
await assert.rejects(runModelAgents({ apiKey: "" }, { evidence, job: {}, userMessage: "Edit" }), /not configured/);

const calls: Record<string, unknown>[] = [];
const mockFetch = (async (url: unknown, options?: RequestInit) => {
  assert.equal(url, "https://api.openai.com/v1/responses");
  const request = JSON.parse(String(options?.body));
  calls.push(request);
  assert.equal(request.store, false);
  assert.equal(request.text.format.strict, true);
  assert.ok(request.instructions.includes("UNTRUSTED DATA"));
  assert.ok(options?.signal);
  const name = request.text.format.name;
  const output = name === "manager_result" ? { specialists: ["resume", "answers"] }
    : name === "resume_result" ? { resume: "TEST CANDIDATE\n• Built API integrations.", answers: [], evidenceIds: [evidence[1].id], notes: [] }
      : name === "answers_result" ? { resume: "", answers: [{ question: "What did you build?", answer: "API integrations.", evidenceIds: [evidence[1].id] }], evidenceIds: [evidence[1].id], notes: [] }
        : { approved: true, warnings: [] };
  return Response.json({ status: "completed", usage: { input_tokens: 10, output_tokens: 20 }, output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(output) }] }] });
}) as typeof fetch;
const result = await runModelAgents({ apiKey: "test-only-not-real", fetcher: mockFetch }, { evidence, job: { description: "Must have invented skills" }, userMessage: "Revise resume and answer", currentDraft: "UNVERIFIED CLAIM", questions: ["What did you build?"] });
assert.equal(result.review.approved, true);
assert.equal(result.requiresReview, true);
assert.equal(result.mode, "model");
assert.equal(result.trace.length, 4);
assert.equal(calls.length, 4);
assert.ok(result.trace.every(item => item.status === "complete" && item.inputTokens === 10));
assert.equal(result.proposal.answers.length, 1);

const failingFetch = (async (url: unknown, options?: RequestInit) => {
  const data = JSON.parse(String(options?.body));
  if (data.text.format.name === "answers_result") return Response.json({ error: "unavailable" }, { status: 429 });
  return mockFetch(url as RequestInfo, options);
}) as typeof fetch;
const partial = await runModelAgents({ apiKey: "test-only-not-real", fetcher: failingFetch }, { evidence, job: {}, userMessage: "Both" });
assert.equal(partial.partial, true);
assert.equal(partial.review.approved, false, "a failed specialist must not become an approved complete proposal");
assert.ok(partial.trace.some(item => item.agent === "answers" && item.status === "error"));
console.log("Mock model checks passed: missing configuration, bounded structured calls, evidence validation, delegation, review, and honest partial errors. No live API called.");

const anthropicFetch = (async (_url:unknown, options?:RequestInit) => { const req=JSON.parse(String(options?.body)); const output=req.system.includes('Choose resume')?{specialists:['resume']}:req.system.includes('Audit proposed')?{approved:true,warnings:[]}:{resume:'Built API integrations.',answers:[],evidenceIds:[evidence[1].id],notes:[]}; return Response.json({stop_reason:'end_turn',usage:{input_tokens:2,output_tokens:3},content:[{type:'text',text:JSON.stringify(output)}]}); }) as typeof fetch;
const anthropic=await runModelAgents({apiKey:'mock',provider:'anthropic',fetcher:anthropicFetch},{evidence,job:{},userMessage:'Revise resume'});
assert.equal(anthropic.review.approved,true);
