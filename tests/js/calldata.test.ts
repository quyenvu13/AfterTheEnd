// Calldata size of every write method, encoded exactly as genlayer-js 1.1.8 does.
import { test } from "node:test";
import assert from "node:assert/strict";
import { calldataBytes, CALLDATA_LIMIT } from "../../src/lib/calldata.ts";
import { CASES, hardBlockRows } from "../../tools/calldata-rows.mjs";

test("ten cases + id-and-note methods at max note stay under 255 bytes", () => {
  assert.equal(Object.keys(CASES).length, 10);
  for (const row of hardBlockRows()) {
    const n = calldataBytes(row.method, row.args);
    assert.ok(n <= CALLDATA_LIMIT, `${row.name}: ${n} bytes`);
  }
});

test("600-character text is over the cliff (UI meter must catch it)", () => {
  const n = calldataBytes("record_clause", ["0x" + "1".repeat(40), "the other side", "x".repeat(600)]);
  assert.ok(n > CALLDATA_LIMIT);
});
