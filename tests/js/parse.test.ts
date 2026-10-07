import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAgreement, parseClause, parseClauses } from "../../src/lib/parse.ts";
import { agreement, clause, inv } from "./fixture.ts";

test("views parse; unknown ids ({}) and malformed rows are null", () => {
  assert.deepEqual(parseAgreement(JSON.stringify(agreement())), agreement());
  assert.deepEqual(parseAgreement(JSON.stringify(JSON.stringify(agreement()))), agreement());
  assert.equal(parseAgreement("{}"), null);
  assert.equal(parseClause("{}"), null);
  assert.equal(parseAgreement(JSON.stringify({ ...agreement(), slot_count: "1" })), null);
  const c = clause({ invocations: [inv()] });
  assert.deepEqual(parseClause(JSON.stringify(c)), c);
  assert.equal(parseClause(JSON.stringify({ ...c, invocations: [{ index: 1 }] })), null);
  assert.deepEqual(parseClauses(JSON.stringify({ agreement_id: "x", total: 1, clauses: [c] })), [c]);
  assert.equal(parseClauses("not json"), null);
});
