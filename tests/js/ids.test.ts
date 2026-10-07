import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { agreementIdOf, clauseIdOf, idsFromInput, textHashOf } from "../../src/lib/ids.ts";

const v = JSON.parse(readFileSync(new URL("./id-vectors.json", import.meta.url), "utf8"));

test("agreement ids match the contract, including whitespace and Unicode titles", () => {
  assert.ok(v.agreements.length >= 4);
  for (const row of v.agreements) assert.equal(agreementIdOf(v.party_a, v.party_b, row.title), row.agreement_id, JSON.stringify(row.title));
});

test("clause ids and text hashes match the contract", () => {
  assert.ok(v.clauses.length >= 6);
  for (const row of v.clauses) {
    assert.equal(clauseIdOf(v.clause_agreement_id, row.text), row.clause_id, JSON.stringify(row.text));
    assert.equal(textHashOf(row.text), row.text_hash, JSON.stringify(row.text));
  }
});

test("the order of the two wallets matters; whitespace variants share one text hash", () => {
  assert.notEqual(agreementIdOf(v.party_a, v.party_b, "x"), agreementIdOf(v.party_b, v.party_a, "x"));
  assert.equal(textHashOf("  One   clause\tholds. "), textHashOf("One clause holds."));
  assert.notEqual(textHashOf("One clause holds."), textHashOf("One clause holds"));
});

test("ids from links", () => {
  const a = "a".repeat(64);
  assert.deepEqual(idsFromInput(`https://x.app/?a=${a}`), [a]);
  assert.deepEqual(idsFromInput(a + "b"), []);
});
