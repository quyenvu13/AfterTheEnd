// Postconditions checked AFTER the receipt says SUCCESS, against reloaded
// accepted state. A write is reported as done only when the state shows it.
// "Check again" re-runs the SAME postcondition of the pending write.

import { textHashOf } from "./ids.ts";
import { pyStrip } from "./pytext.ts";
import type { Agreement, Clause } from "./types.ts";

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export function openVerified(a: Agreement | null, s: { id: string; me: string; other: string; title: string }): boolean {
  return !!a && a.agreement_id === s.id && same(a.party_a, s.me) && same(a.party_b, s.other) && a.title === pyStrip(s.title) &&
    a.state === "LIVE" && a.slot_count === 0 && a.active_count === 0;
}

/** Proposed by me, my exact text, waiting for the other side; SURVIVES is STANDING and DIES_WITH_IT is LAPSED. */
export function proposeVerified(before: Agreement, after: Agreement | null, c: Clause | null, s: { id: string; me: string; text: string }): boolean {
  if (!after || !c || c.clause_id !== s.id || c.agreement_id !== before.agreement_id || !same(c.proposer, s.me) ||
      c.text !== pyStrip(s.text) || c.text_hash !== textHashOf(s.text) || c.state !== "PROPOSED" || c.invocable) return false;
  if (after.slot_count !== before.slot_count + 1 || after.active_count !== before.active_count + 1) return false;
  return (c.outcome === "SURVIVES" && c.fate === "STANDING") || (c.outcome === "DIES_WITH_IT" && c.fate === "LAPSED");
}

export function ratifyVerified(before: Agreement, c0: Clause, after: Agreement | null, c: Clause | null): boolean {
  if (!after || !c || c.state !== "RATIFIED" || c.text_hash !== c0.text_hash || c.fate !== c0.fate || !c.invocable) return false;
  return c.fate === "STANDING"
    ? after.standing_count === before.standing_count + 1 && after.lapsed_count === before.lapsed_count
    : after.lapsed_count === before.lapsed_count + 1 && after.standing_count === before.standing_count;
}

export function declineVerified(before: Agreement, after: Agreement | null, c: Clause | null): boolean {
  return !!after && !!c && c.state === "DECLINED" && after.active_count === before.active_count - 1;
}

export function withdrawVerified(before: Agreement, after: Agreement | null, c: Clause | null): boolean {
  return !!after && !!c && c.state === "WITHDRAWN" && after.active_count === before.active_count - 1;
}

/** One more invocation, by me, my note, waiting for the other side's answer. */
export function invokeVerified(c0: Clause, c: Clause | null, me: string, note: string): boolean {
  if (!c || c.invocations.length !== c0.invocations.length + 1) return false;
  const last = c.invocations[c.invocations.length - 1];
  return last.index === c.invocations.length && same(last.by, me) && last.note === pyStrip(note) && last.state === "PENDING";
}

export function respondVerified(c: Clause | null, index: number, verdict: "ACKNOWLEDGED" | "CONTESTED", note: string): boolean {
  const inv = c?.invocations.find((i) => i.index === index);
  return !!inv && inv.state === verdict && inv.response_note === pyStrip(note);
}

export function requestCloseVerified(a: Agreement | null, me: string): boolean {
  return !!a && a.state === "CLOSING" && same(a.close_requested_by, me) && a.closed_by === "";
}

export function cancelCloseVerified(a: Agreement | null): boolean {
  return !!a && a.state === "LIVE" && a.close_requested_by === "" && a.closed_by === "";
}

/** CLOSED by me after the other side's request; nothing is left PROPOSED; LAPSED clauses are no longer invocable. */
export function confirmCloseVerified(before: Agreement, a: Agreement | null, clauses: Clause[] | null, me: string): boolean {
  if (!a || !clauses || a.state !== "CLOSED" || !same(a.closed_by, me) || !same(a.close_requested_by, before.close_requested_by)) return false;
  if (clauses.some((c) => c.state === "PROPOSED")) return false;
  return clauses.every((c) => c.state !== "RATIFIED" || c.invocable === (c.fate === "STANDING"));
}
