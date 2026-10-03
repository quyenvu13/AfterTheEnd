// Postconditions must reject a stale record that merely has the expected id.
import { test } from "node:test";
import assert from "node:assert/strict";
import { closeVerified, contestVerified, invokeVerified, recordVerified } from "../../src/lib/verify.ts";
import type { Agreement, Clause } from "../../src/lib/types.ts";

const ME = "0x" + "a".repeat(40);
const OTHER = "0x" + "b".repeat(40);
const AID = "1".repeat(64);
const CID = "2".repeat(64);
const ag = (o: Partial<Agreement> = {}): Agreement => ({ agreement_id: AID, author: ME, other_wallet: OTHER, other_label: "the other side",
  state: "LIVE", closed_by: "", closed_at: "", clause_count: 1, standing_count: 1, lapsed_count: 0, ...o });
const cl = (o: Partial<Clause> = {}): Clause => ({ clause_id: CID, agreement_id: AID, text: "A clause.", outcome: "SURVIVES", fate: "STANDING",
  invocation_count: 0, invocable: true, agreement_state: "LIVE", author: ME, other_wallet: OTHER, ...o });
const sub = { me: ME, otherWallet: OTHER, label: "the other side", text: "  A clause. ", agreementId: AID, clauseId: CID };

test("fresh first clause verifies", () => {
  assert.equal(recordVerified(null, ag(), cl(), sub), true);
});

test("counters must move by exactly one from the snapshot", () => {
  assert.equal(recordVerified(ag(), ag(), cl(), sub), false);                     // nothing moved: stale
  assert.equal(recordVerified(ag(), ag({ clause_count: 2, standing_count: 2 }), cl(), sub), true);
  assert.equal(recordVerified(ag(), ag({ clause_count: 2, standing_count: 1, lapsed_count: 1 }), cl(), sub), false); // wrong bucket
});

test("every written field must match", () => {
  assert.equal(recordVerified(null, ag(), cl({ text: "Other text." }), sub), false);
  assert.equal(recordVerified(null, ag({ other_wallet: "0x" + "c".repeat(40) }), cl(), sub), false);
  assert.equal(recordVerified(null, ag(), cl({ invocation_count: 1 }), sub), false);
  assert.equal(recordVerified(null, ag(), cl({ outcome: "DIES_WITH_IT" }), sub), false);   // label/fate mismatch
  assert.equal(recordVerified(null, ag({ state: "CLOSED" }), cl(), sub), false);
  assert.equal(recordVerified(null, null, cl(), sub), false);
});

test("invoke / close / contest postconditions", () => {
  const inv = { clause_id: CID, index: 3, note: "used", by: ME, contested: false };
  assert.equal(invokeVerified(2, cl({ invocation_count: 3 }), inv, ME, " used "), true);
  assert.equal(invokeVerified(3, cl({ invocation_count: 3 }), inv, ME, "used"), false);
  assert.equal(invokeVerified(2, cl({ invocation_count: 3 }), { ...inv, by: OTHER }, ME, "used"), false);
  assert.equal(closeVerified(ag({ state: "CLOSED", closed_by: ME, closed_at: "2026-10-03T00:00:00Z" }), ME), true);
  assert.equal(closeVerified(ag({ state: "CLOSED", closed_by: OTHER, closed_at: "x" }), ME), false);
  assert.equal(contestVerified({ ...inv, contested: true, contest_note: "no" }, " no "), true);
  assert.equal(contestVerified({ ...inv, contested: false }, "no"), false);
});
