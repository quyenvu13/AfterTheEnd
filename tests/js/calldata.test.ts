// Calldata size of every write method, encoded exactly as genlayer-js 1.1.8 does.
import { test } from "node:test";
import assert from "node:assert/strict";
import { calldataBytes, CALLDATA_LIMIT } from "../../src/lib/calldata.ts";
import { MAX_TEXT_LENGTH } from "../../src/lib/rules.ts";
import { CASES, hardBlockRows, ID } from "../../tools/calldata-rows.mjs";

test("ten case texts + every write at its contract cap stay under 255 bytes", () => {
  assert.equal(Object.keys(CASES).length, 10);
  for (const row of hardBlockRows()) {
    const n = calldataBytes(row.method, row.args);
    assert.ok(n <= CALLDATA_LIMIT, `${row.name}: ${n} bytes`);
  }
});

test("the 140-character text cap fits in ASCII; non-ASCII can pass 255 bytes, so the meter must stop it", () => {
  assert.equal(MAX_TEXT_LENGTH, 140);
  assert.ok(calldataBytes("propose_clause", [ID, "x".repeat(140)]) <= CALLDATA_LIMIT);
  assert.ok(calldataBytes("propose_clause", [ID, "é".repeat(140)]) > CALLDATA_LIMIT);
});
