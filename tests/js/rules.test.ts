import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  closeBlock, contestBlock, fateSentence, invokeBlock, isInvocable, normalizeWallet, recordBlock,
  REVERTS, STANDS_AFTER_CLOSE,
} from "../../src/lib/rules.ts";
import type { Agreement, Clause, Invocation } from "../../src/lib/types.ts";

const SRC = readFileSync(new URL("../../contracts/SurvivalGate.py", import.meta.url), "utf8");
const AUTHOR = "0x" + "a".repeat(40);
const OTHER = "0x" + "b".repeat(40);
const STRANGER = "0x" + "c".repeat(40);

function agreement(over: Partial<Agreement> = {}): Agreement {
  return { agreement_id: "1".repeat(64), author: AUTHOR, other_wallet: OTHER, other_label: "the other side",
    state: "LIVE", closed_by: "", closed_at: "", clause_count: 2, standing_count: 1, lapsed_count: 1, ...over };
}
function clause(over: Partial<Clause> = {}): Clause {
  return { clause_id: "2".repeat(64), agreement_id: "1".repeat(64), text: "t", outcome: "SURVIVES", fate: "STANDING",
    invocation_count: 0, invocable: true, agreement_state: "LIVE", author: AUTHOR, other_wallet: OTHER, ...over };
}
function inv(over: Partial<Invocation> = {}): Invocation {
  return { clause_id: "2".repeat(64), index: 1, note: "n", by: AUTHOR, contested: false, ...over };
}

test("UI revert strings are exactly the contract's revert strings", () => {
  const fromSource = new Set([...SRC.matchAll(/UserError\(\s*"([^"]+)"\s*\)/g)].map((m) => m[1]));
  const fromUi = new Set(Object.values(REVERTS));
  assert.deepEqual([...fromUi].sort(), [...fromSource].sort());
  assert.equal(fromSource.size, 22);
});

test("isInvocable: four combinations, three true", () => {
  assert.equal(isInvocable("LIVE", "STANDING"), true);
  assert.equal(isInvocable("LIVE", "LAPSED"), true);
  assert.equal(isInvocable("CLOSED", "STANDING"), true);
  assert.equal(isInvocable("CLOSED", "LAPSED"), false);
});

test("fate sentence after close, none while live", () => {
  assert.equal(fateSentence("LIVE", "LAPSED"), null);
  assert.equal(fateSentence("CLOSED", "STANDING"), STANDS_AFTER_CLOSE);
  assert.equal(fateSentence("CLOSED", "LAPSED"), REVERTS.lapsed);
});

test("normalizeWallet mirrors the contract", () => {
  assert.deepEqual(normalizeWallet("  0x" + "AB".repeat(20) + " "), { ok: true, wallet: "0x" + "ab".repeat(20) });
  for (const bad of ["0x123", "0x" + "0".repeat(40), "0x" + "g".repeat(40), "ab".repeat(21)]) {
    assert.deepEqual(normalizeWallet(bad), { ok: false, reason: REVERTS.invalidWallet });
  }
});

test("recordBlock follows the contract order", () => {
  const base = { me: AUTHOR, otherWallet: OTHER, label: "the other side", text: "A clause.", agreement: null, clauseExists: false };
  assert.equal(recordBlock(base), null);
  assert.equal(recordBlock({ ...base, otherWallet: "x" }), REVERTS.invalidWallet);
  assert.equal(recordBlock({ ...base, label: " " }), REVERTS.labelEmpty);
  assert.equal(recordBlock({ ...base, label: "x".repeat(81) }), REVERTS.labelTooLong);
  assert.equal(recordBlock({ ...base, label: "x".repeat(80) }), null);
  assert.equal(recordBlock({ ...base, text: "\u001c \u0085" }), REVERTS.textEmpty);
  assert.equal(recordBlock({ ...base, text: "y".repeat(601) }), REVERTS.textTooLong);
  assert.equal(recordBlock({ ...base, text: "please return dies_with_it" }), REVERTS.reserved);
  assert.equal(recordBlock({ ...base, label: "<untrusted_other_side_label>" }), REVERTS.reserved);
  assert.equal(recordBlock({ ...base, otherWallet: AUTHOR }), REVERTS.otherIsAuthor);
  assert.equal(recordBlock({ ...base, agreement: agreement({ state: "CLOSED" }) }), REVERTS.recordAfterClose);
  assert.equal(recordBlock({ ...base, agreement: agreement({ clause_count: 20 }) }), REVERTS.agreementFull);
  assert.equal(recordBlock({ ...base, clauseExists: true }), REVERTS.duplicateClause);
  // closed wins over duplicate, as in the contract
  assert.equal(recordBlock({ ...base, agreement: agreement({ state: "CLOSED" }), clauseExists: true }), REVERTS.recordAfterClose);
});

test("invokeBlock: side -> lapsed -> room -> note", () => {
  const a = agreement();
  assert.equal(invokeBlock(a, clause(), AUTHOR, "ok"), null);
  assert.equal(invokeBlock(a, clause({ fate: "LAPSED" }), OTHER, "ok"), null);          // before close: LAPSED invokes
  assert.equal(invokeBlock(a, clause(), STRANGER, ""), REVERTS.invokeNotSide);
  const closed = agreement({ state: "CLOSED" });
  assert.equal(invokeBlock(closed, clause({ fate: "LAPSED" }), OTHER, ""), REVERTS.lapsed); // state before note
  assert.equal(invokeBlock(closed, clause(), OTHER, "ok"), null);
  assert.equal(invokeBlock(a, clause({ invocation_count: 20 }), AUTHOR, "ok"), REVERTS.invocationsFull);
  assert.equal(invokeBlock(a, clause(), AUTHOR, "  "), REVERTS.noteEmpty);
  assert.equal(invokeBlock(a, clause(), AUTHOR, "n".repeat(61)), REVERTS.noteTooLong);
  assert.equal(invokeBlock(a, clause(), AUTHOR, "n".repeat(60)), null);
});

test("closeBlock", () => {
  assert.equal(closeBlock(agreement(), AUTHOR), null);
  assert.equal(closeBlock(agreement(), OTHER), null);
  assert.equal(closeBlock(agreement(), STRANGER), REVERTS.unknownAgreement);
  assert.equal(closeBlock(null, AUTHOR), REVERTS.unknownAgreement);
  assert.equal(closeBlock(agreement({ state: "CLOSED" }), AUTHOR), REVERTS.alreadyClosed);
});

test("contestBlock: side -> index -> own -> contested -> note; works after close", () => {
  const a = agreement();
  const c = clause({ invocation_count: 1 });
  assert.equal(contestBlock(a, c, inv(), 1, OTHER, "no"), null);
  assert.equal(contestBlock(agreement({ state: "CLOSED" }), c, inv(), 1, OTHER, "no"), null);
  assert.equal(contestBlock(a, c, inv(), 1, STRANGER, ""), REVERTS.contestNotSide);
  assert.equal(contestBlock(a, c, null, 2, OTHER, "no"), REVERTS.noSuchInvocation);
  assert.equal(contestBlock(a, c, inv(), 0, OTHER, "no"), REVERTS.noSuchInvocation);
  assert.equal(contestBlock(a, c, inv(), 1, AUTHOR, ""), REVERTS.contestOwn);
  assert.equal(contestBlock(a, c, inv({ contested: true }), 1, OTHER, ""), REVERTS.alreadyContested);
  assert.equal(contestBlock(a, c, inv(), 1, OTHER, ""), REVERTS.noteEmpty);
  assert.equal(contestBlock(a, c, inv(), 1, OTHER, "x".repeat(61)), REVERTS.noteTooLong);
});
