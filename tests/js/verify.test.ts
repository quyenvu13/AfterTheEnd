// Postconditions: a write is reported as done only when the reloaded state shows it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { clauseIdOf } from "../../src/lib/ids.ts";
import {
  cancelCloseVerified, confirmCloseVerified, declineVerified, invokeVerified, openVerified, proposeVerified, ratifyVerified,
  requestCloseVerified, respondVerified, withdrawVerified,
} from "../../src/lib/verify.ts";
import { A, AID, agreement, B, clause, E1, inv, S4, TITLE } from "./fixture.ts";

test("open: mine, the named other side, LIVE and empty", () => {
  const s = { id: AID, me: A, other: B, title: `  ${TITLE} ` };
  const a = agreement({ slot_count: 0, active_count: 0 });
  assert.ok(openVerified(a, s));
  assert.ok(!openVerified({ ...a, party_b: A }, s));
  assert.ok(!openVerified({ ...a, state: "CLOSING" }, s));
});

test("propose: PROPOSED by me, not invocable, counters moved; verdict and fate agree", () => {
  const before = agreement({ slot_count: 0, active_count: 0 });
  const after = agreement();
  const s = { id: clauseIdOf(AID, S4), me: A, text: ` ${S4} ` };
  assert.ok(proposeVerified(before, after, clause(), s));
  assert.ok(!proposeVerified(before, after, clause({ fate: "LAPSED" }), s));
  assert.ok(!proposeVerified(before, after, clause({ state: "RATIFIED", invocable: true }), s), "bound at once is wrong");
  assert.ok(!proposeVerified(before, before, clause(), s));
});

test("ratify: RATIFIED with the same hash and fate; the right counter moves", () => {
  const before = agreement();
  const c0 = clause();
  assert.ok(ratifyVerified(before, c0, agreement({ standing_count: 1 }), clause({ state: "RATIFIED", invocable: true })));
  assert.ok(!ratifyVerified(before, c0, agreement({ lapsed_count: 1 }), clause({ state: "RATIFIED", invocable: true })));
  assert.ok(!ratifyVerified(before, c0, agreement({ standing_count: 1 }), clause({ state: "RATIFIED", invocable: true, text_hash: "0".repeat(64) })));
});

test("decline and withdraw free the active slot", () => {
  assert.ok(declineVerified(agreement(), agreement({ active_count: 0 }), clause({ state: "DECLINED" })));
  assert.ok(!declineVerified(agreement(), agreement(), clause({ state: "DECLINED" })));
  assert.ok(withdrawVerified(agreement(), agreement({ active_count: 0 }), clause({ state: "WITHDRAWN" })));
});

test("invoke and answer", () => {
  const c0 = clause({ state: "RATIFIED", invocable: true });
  assert.ok(invokeVerified(c0, { ...c0, invocations: [inv({ by: B, note: "late" })] }, B, " late "));
  assert.ok(!invokeVerified(c0, { ...c0, invocations: [inv({ by: A })] }, B, "invoice 12 unpaid"));
  const answered = { ...c0, invocations: [inv({ state: "CONTESTED", response_note: "Already paid" })] };
  assert.ok(respondVerified(answered, 1, "CONTESTED", "Already paid"));
  assert.ok(!respondVerified(answered, 1, "ACKNOWLEDGED", "Already paid"));
});

test("close: request, cancel, confirm", () => {
  assert.ok(requestCloseVerified(agreement({ state: "CLOSING", close_requested_by: A }), A));
  assert.ok(!requestCloseVerified(agreement({ state: "CLOSED", close_requested_by: A, closed_by: A }), A), "one side alone closing is wrong");
  assert.ok(cancelCloseVerified(agreement()));
  const before = agreement({ state: "CLOSING", close_requested_by: A });
  const closed = agreement({ state: "CLOSED", close_requested_by: A, closed_by: B });
  const stand = clause({ state: "RATIFIED", invocable: true });
  const lapse = clause({ state: "RATIFIED", fate: "LAPSED", invocable: false }, E1);
  assert.ok(confirmCloseVerified(before, closed, [stand, lapse, clause({ state: "VOID" }, "v")], B));
  assert.ok(!confirmCloseVerified(before, closed, [stand, clause({ state: "PROPOSED" }, "p")], B), "a pending proposal must be void");
  assert.ok(!confirmCloseVerified(before, closed, [{ ...lapse, invocable: true }], B), "LAPSED must stop being invocable");
  assert.ok(!confirmCloseVerified(before, closed, [stand], A));
});
