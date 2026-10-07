// The single settle rule for a write, used both right after sending and by
// "Check again". A write counts as done only when (1) the receipt is applied
// AND (2) the write's own postcondition holds on reloaded accepted state.
// "Check again" re-runs the SAME postcondition closure of the pending write;
// it never reports success from the receipt alone.

import type { ReceiptVerdict } from "./receipt.ts";

export type Verify = () => Promise<string | null>;
export type Settled =
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }
  | { kind: "pending"; message: string };

export const PENDING_RECEIPT = "Submitted — confirmation delayed. Check again re-reads the receipt and the accepted state; do not send it twice.";
export const PENDING_STATE = "Executed, but the accepted state does not show the change yet. Check again in a moment.";

export async function settle(verdict: ReceiptVerdict, verify: Verify): Promise<Settled> {
  if (verdict.kind === "error") return { kind: "error", message: verdict.reason };
  if (verdict.kind === "pending") return { kind: "pending", message: PENDING_RECEIPT };
  const done = await verify();
  return done ? { kind: "success", message: done } : { kind: "pending", message: PENDING_STATE };
}
