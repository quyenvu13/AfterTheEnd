// The retry path: "Check again" settles a pending write with the SAME rule as the first
// attempt: receipt applied AND the write's own postcondition true on reloaded state.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PENDING_RECEIPT, PENDING_STATE, settle } from "../../src/lib/retry.ts";

const ok = { kind: "success", status: "ACCEPTED" } as const;

test("receipt success alone is not success: the postcondition decides", async () => {
  assert.deepEqual(await settle(ok, async () => null), { kind: "pending", message: PENDING_STATE });
  assert.deepEqual(await settle(ok, async () => "done"), { kind: "success", message: "done" });
});

test("a pending receipt never runs the postcondition; a rolled-back one reports the contract's reason", async () => {
  let ran = false;
  assert.deepEqual(await settle({ kind: "pending", status: "PROPOSING" }, async () => { ran = true; return "x"; }), { kind: "pending", message: PENDING_RECEIPT });
  assert.equal(ran, false);
  assert.deepEqual(await settle({ kind: "error", status: "ACCEPTED", reason: "Only a ratified clause can be invoked" }, async () => "x"),
    { kind: "error", message: "Only a ratified clause can be invoked" });
});

test("App: Check again re-reads the receipt of the same tx and re-runs its stored verify closure", () => {
  const app = readFileSync(new URL("../../src/App.tsx", import.meta.url), "utf8");
  const body = app.slice(app.indexOf("async function checkAgain()"), app.indexOf("function openAgreementView"));
  assert.ok(body.includes("settle(await readVerdict(pending.hash), pending.verify)"));
  assert.ok(!/async\s*\(\)\s*=>\s*true/.test(app), "no always-true verify anywhere");
  assert.ok(app.includes("recheck.current = { hash, verify }"));
  assert.equal((app.match(/settle\(/g) ?? []).length, 2, "runWrite and checkAgain share settle()");
});
