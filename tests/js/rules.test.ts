// Every predictable revert, in the contract's own order, with its exact sentence.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  cancelCloseBlock, closeEffect, confirmCloseBlock, declineBlock, invokeBlock, openBlock, proposeBlock, ratifyBlock,
  requestCloseBlock, RESERVED_TOKENS, respondBlock, REVERTS, UI, withdrawBlock,
} from "../../src/lib/rules.ts";
import { A, agreement, B, clause, E1, inv, S, S4, TITLE } from "./fixture.ts";

const contract = readFileSync(new URL("../../contracts/ClauseAccord.py", import.meta.url), "utf8");

test("every revert sentence is the contract's own, and every contract revert is mirrored", () => {
  const inContract = [...contract.matchAll(/UserError\(\s*"([^"]+)"\s*\)/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(Object.values(REVERTS))].sort(), [...new Set(inContract)].sort());
});

test("reserved tokens and limits equal the contract's", () => {
  for (const t of RESERVED_TOKENS) assert.ok(contract.includes(`"${t}"`), t);
  for (const line of ["MAX_TITLE_LENGTH = 60", "MAX_TEXT_LENGTH = 140", "MAX_NOTE_LENGTH = 60", "MAX_ACTIVE_CLAUSES = 20",
    "MAX_CLAUSE_SLOTS = 40", "MAX_INVOCATIONS = 20"]) assert.ok(contract.includes(line), line);
});

test("open_agreement: wallet -> title -> reserved -> not yourself -> exists", () => {
  const ok = { me: A, other: B, title: TITLE, exists: false };
  assert.equal(openBlock(ok), null);
  assert.equal(openBlock({ ...ok, me: "" }), UI.noWallet);
  assert.equal(openBlock({ ...ok, other: "0x12" }), REVERTS.invalidWallet);
  assert.equal(openBlock({ ...ok, other: "0x" + "0".repeat(40) }), REVERTS.invalidWallet);
  assert.equal(openBlock({ ...ok, title: "  " }), REVERTS.titleEmpty);
  assert.equal(openBlock({ ...ok, title: "t".repeat(61) }), REVERTS.titleTooLong);
  assert.equal(openBlock({ ...ok, title: "survives" }), REVERTS.reserved);
  assert.equal(openBlock({ ...ok, other: A.toUpperCase().replace("0X", "0x") }), REVERTS.self);
  assert.equal(openBlock({ ...ok, exists: true }), REVERTS.exists);
});

test("propose_clause: side -> live -> text -> reserved -> room -> not proposed -> bytes", () => {
  const a = agreement();
  assert.equal(proposeBlock(a, [], B, E1, 150), null);
  assert.equal(proposeBlock(a, [], S, E1, 150), REVERTS.sides);
  assert.equal(proposeBlock(agreement({ state: "CLOSING" }), [], A, E1, 150), REVERTS.notLive);
  assert.equal(proposeBlock(a, [], A, " ", 150), REVERTS.textEmpty);
  assert.equal(proposeBlock(a, [], A, "t".repeat(141), 150), REVERTS.textTooLong);
  assert.equal(proposeBlock(a, [], A, "it dies_with_it", 150), REVERTS.reserved);
  assert.equal(proposeBlock(agreement({ active_count: 20 }), [], A, E1, 150), REVERTS.full);
  assert.equal(proposeBlock(agreement({ slot_count: 40, active_count: 0 }), [], A, E1, 150), REVERTS.full);
  assert.equal(proposeBlock(a, [clause({ state: "WITHDRAWN" })], B, `  ${S4} `, 150), REVERTS.proposed);
  assert.equal(proposeBlock(a, [], A, E1, 256), UI.tooManyBytes);
});

test("ratify / decline: the other side only, while proposed and live, the exact text", () => {
  const a = agreement();
  const c = clause();
  assert.equal(ratifyBlock(a, c, B, true), null);
  assert.equal(ratifyBlock(a, c, B, false), UI.notRead);
  assert.equal(ratifyBlock(a, c, S, true), REVERTS.sides);
  assert.equal(ratifyBlock(a, c, A, true), REVERTS.otherRatifies, "the proposer cannot ratify its own clause");
  assert.equal(ratifyBlock(a, clause({ state: "RATIFIED" }), B, true), REVERTS.notAwaiting);
  assert.equal(ratifyBlock(agreement({ state: "CLOSING" }), c, B, true), REVERTS.notLive);
  assert.equal(ratifyBlock(a, clause({ text_hash: "0".repeat(64) }), B, true), REVERTS.mismatch);
  assert.equal(declineBlock(a, c, B), null);
  assert.equal(declineBlock(agreement({ state: "CLOSING" }), c, B), null, "declining stays possible while closing");
  assert.equal(declineBlock(a, c, A), REVERTS.otherRatifies);
  assert.equal(declineBlock(a, clause({ state: "DECLINED" }), B), REVERTS.notAwaiting);
});

test("withdraw: the proposer only, while proposed", () => {
  assert.equal(withdrawBlock(clause(), A), null);
  assert.equal(withdrawBlock(clause(), B), REVERTS.onlyProposer);
  assert.equal(withdrawBlock(clause({ state: "VOID" }), A), REVERTS.notAwaiting);
});

test("invoke: side -> ratified -> not lapsed after the close -> room -> note -> bytes", () => {
  const r = clause({ state: "RATIFIED", invocable: true });
  const lapsed = clause({ state: "RATIFIED", fate: "LAPSED", outcome: "DIES_WITH_IT" }, E1);
  assert.equal(invokeBlock(agreement(), r, B, "x", 150), null);
  assert.equal(invokeBlock(agreement(), r, S, "x", 150), REVERTS.sides);
  assert.equal(invokeBlock(agreement(), clause(), A, "x", 150), REVERTS.onlyRatified, "a proposal binds nothing");
  assert.equal(invokeBlock(agreement({ state: "CLOSING" }), lapsed, A, "x", 150), null, "LAPSED still binds until the close");
  assert.equal(invokeBlock(agreement({ state: "CLOSED" }), lapsed, A, "x", 150), REVERTS.lapsed);
  assert.equal(invokeBlock(agreement({ state: "CLOSED" }), r, A, "x", 150), null);
  assert.equal(invokeBlock(agreement(), clause({ state: "RATIFIED", invocations: Array.from({ length: 20 }, (_, i) => inv({ index: i + 1 })) }), A, "x", 150), REVERTS.noRoom);
  assert.equal(invokeBlock(agreement(), r, A, " ", 150), REVERTS.noteEmpty);
  assert.equal(invokeBlock(agreement(), r, A, "n".repeat(61), 150), REVERTS.noteTooLong);
  assert.equal(invokeBlock(agreement(), r, A, "x", 300), UI.tooManyBytes);
});

test("answer an invocation: side -> index -> not the invoker -> pending -> note", () => {
  const c = clause({ state: "RATIFIED", invocations: [inv()] });
  assert.equal(respondBlock(agreement(), c, inv(), B, "Paid"), null);
  assert.equal(respondBlock(agreement(), c, inv(), S, "Paid"), REVERTS.sides);
  assert.equal(respondBlock(agreement(), c, inv({ index: 2 }), B, "Paid"), REVERTS.noSuchInvocation);
  assert.equal(respondBlock(agreement(), c, inv(), A, "mine"), REVERTS.otherAnswers);
  assert.equal(respondBlock(agreement(), c, inv({ state: "CONTESTED" }), B, "again"), REVERTS.answered);
  assert.equal(respondBlock(agreement(), c, inv(), B, ""), REVERTS.noteEmpty);
});

test("close takes two signatures; only the requester cancels", () => {
  assert.equal(requestCloseBlock(agreement(), A), null);
  assert.equal(requestCloseBlock(agreement(), S), REVERTS.sides);
  assert.equal(requestCloseBlock(agreement({ state: "CLOSING", close_requested_by: A }), B), REVERTS.notLive);
  const closing = agreement({ state: "CLOSING", close_requested_by: A });
  assert.equal(confirmCloseBlock(closing, B), null);
  assert.equal(confirmCloseBlock(closing, A), REVERTS.otherConfirms);
  assert.equal(confirmCloseBlock(agreement(), B), REVERTS.noClose);
  assert.equal(cancelCloseBlock(closing, A), null);
  assert.equal(cancelCloseBlock(closing, B), REVERTS.onlyRequester);
  assert.equal(cancelCloseBlock(agreement({ state: "CLOSED", close_requested_by: A, closed_by: B }), A), REVERTS.noClose);
});

test("close preview lists what lapses and what becomes void", () => {
  const e = closeEffect([
    clause({ state: "RATIFIED" }), clause({ state: "RATIFIED", fate: "LAPSED" }, E1), clause({ state: "PROPOSED" }, "pending"),
    clause({ state: "DECLINED" }, "declined"),
  ]);
  assert.deepEqual([e.standing.length, e.lapsing.length, e.voiding.length], [1, 1, 1]);
  assert.equal(e.lapsing[0].text, E1);
});
