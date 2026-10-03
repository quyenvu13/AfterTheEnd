// tools/ids.html (offline helper for Studio runs) must give the contract's ids.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../../tools/ids.html", import.meta.url), "utf8");
const core = html.match(/<script id="core">([\s\S]*?)<\/script>/)![1];
const api = new Function(core + "; return { agreementId, clauseId, keccak256Hex };")() as {
  agreementId: (a: string, o: string) => string; clauseId: (aid: string, t: string) => string; keccak256Hex: (b: Uint8Array) => string;
};
const v = JSON.parse(readFileSync(new URL("./id-vectors.json", import.meta.url), "utf8"));

test("keccak256 known answers", () => {
  assert.equal(api.keccak256Hex(new Uint8Array()), "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470");
  assert.equal(api.keccak256Hex(new TextEncoder().encode("a".repeat(200))).length, 64);
});

test("ids.html matches the contract vectors", () => {
  assert.equal(api.agreementId(v.author, v.other), v.agreement_id);
  for (const row of v.clauses) assert.equal(api.clauseId(v.agreement_id, row.text), row.clause_id, JSON.stringify(row.text));
});
