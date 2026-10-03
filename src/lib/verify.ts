// Postconditions checked AFTER the receipt says SUCCESS, against freshly
// reloaded accepted state. A record that merely has the expected id is not
// proof: every field this transaction should have written must match, and
// counters must have moved by exactly one from the snapshot taken before.

import { pyStrip } from "./pytext.ts";
import type { Agreement, Clause, Invocation } from "./types.ts";

export type RecordSubmission = {
  me: string;
  otherWallet: string;   // normalized
  label: string;
  text: string;
  agreementId: string;
  clauseId: string;
};

export function recordVerified(
  before: Agreement | null,
  after: Agreement | null,
  clause: Clause | null,
  s: RecordSubmission,
): boolean {
  if (!after || !clause) return false;
  const fateOk =
    (clause.fate === "STANDING" && clause.outcome === "SURVIVES") ||
    (clause.fate === "LAPSED" && clause.outcome === "DIES_WITH_IT");
  const countBefore = before ? before.clause_count : 0;
  const standingBefore = before ? before.standing_count : 0;
  const lapsedBefore = before ? before.lapsed_count : 0;
  const movedOne =
    after.clause_count === countBefore + 1 &&
    after.standing_count + after.lapsed_count === after.clause_count &&
    (clause.fate === "STANDING"
      ? after.standing_count === standingBefore + 1 && after.lapsed_count === lapsedBefore
      : after.lapsed_count === lapsedBefore + 1 && after.standing_count === standingBefore);
  return (
    fateOk &&
    movedOne &&
    clause.clause_id === s.clauseId &&
    clause.agreement_id === s.agreementId &&
    clause.text === pyStrip(s.text) &&
    clause.invocation_count === 0 &&
    after.agreement_id === s.agreementId &&
    after.author.toLowerCase() === s.me.toLowerCase() &&
    after.other_wallet === s.otherWallet &&
    after.state === "LIVE" &&
    (before !== null || after.other_label === pyStrip(s.label))
  );
}

export function invokeVerified(countBefore: number, after: Clause | null, inv: Invocation | null, me: string, note: string): boolean {
  return (
    !!after && !!inv &&
    after.invocation_count === countBefore + 1 &&
    inv.index === countBefore + 1 &&
    inv.note === pyStrip(note) &&
    inv.by.toLowerCase() === me.toLowerCase() &&
    inv.contested === false
  );
}

export function closeVerified(after: Agreement | null, me: string): boolean {
  return !!after && after.state === "CLOSED" && after.closed_by.toLowerCase() === me.toLowerCase() && after.closed_at !== "";
}

export function contestVerified(inv: Invocation | null, note: string): boolean {
  return !!inv && inv.contested === true && inv.contest_note === pyStrip(note);
}
