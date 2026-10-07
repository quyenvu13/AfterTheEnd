// Mirrors every revert of contracts/ClauseAccord.py that can be predicted from state
// already read, in the SAME order the contract checks them. Whether a clause reaches
// past the close is NEVER decided here: only validators decide that, inside
// propose_clause(). The verdict and the fate are read back from the view.

import { clauseIdOf, textHashOf } from "./ids.ts";
import { pyContainsToken, pyLen, pyStrip } from "./pytext.ts";
import type { Agreement, Clause, Invocation } from "./types.ts";

export const MAX_TITLE_LENGTH = 60;
export const MAX_TEXT_LENGTH = 140;
export const MAX_NOTE_LENGTH = 60;
export const MAX_ACTIVE_CLAUSES = 20;
export const MAX_CLAUSE_SLOTS = 40;
export const MAX_INVOCATIONS = 20;

export const RESERVED_TOKENS = ["<UNTRUSTED_CLAUSE_TEXT>", "</UNTRUSTED_CLAUSE_TEXT>", "SURVIVES", "DIES_WITH_IT"] as const;

export const REVERTS = {
  invalidWallet: "Invalid wallet address",
  titleEmpty: "Title is empty",
  titleTooLong: "Title is too long",
  textEmpty: "Text is empty",
  textTooLong: "Text is too long",
  noteEmpty: "Note is empty",
  noteTooLong: "Note is too long",
  reserved: "Text contains a reserved token",
  self: "The other side cannot be yourself",
  exists: "This agreement already exists",
  unknownAgreement: "Unknown agreement",
  unknownClause: "Unknown clause id",
  sides: "Only the two sides of this agreement may do this",
  notLive: "This agreement is not live",
  noClose: "No close is waiting for confirmation",
  onlyRequester: "Only the side that asked to close may cancel",
  otherConfirms: "The other side must confirm the close",
  full: "This agreement is full",
  proposed: "This clause was already proposed in this agreement",
  otherRatifies: "The other side must ratify or decline this clause",
  notAwaiting: "This clause is not awaiting ratification",
  mismatch: "The ratified text does not match this clause",
  onlyProposer: "Only the proposer may withdraw this clause",
  onlyRatified: "Only a ratified clause can be invoked",
  lapsed: "This clause lapsed when the agreement was closed",
  noRoom: "No room for further invocations",
  noSuchInvocation: "No such invocation",
  otherAnswers: "Only the other side may answer this invocation",
  answered: "This invocation has already been answered",
} as const;

/** UI-only reasons (the contract never sees these calls). */
export const UI = {
  noWallet: "Connect a wallet first",
  notRead: "Tick the box after reading the clause",
  tooManyBytes: "This text is over the 255-byte calldata limit; shorten it",
} as const;

const ZERO = "0x" + "0".repeat(40);
export const same = (a: string, b: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

export function walletOrEmpty(value: string): string {
  const w = pyStrip(value).toLowerCase();
  return /^0x[0-9a-f]{40}$/.test(w) ? w : "";
}

export function isSide(a: Agreement, me: string): boolean {
  return same(a.party_a, me) || same(a.party_b, me);
}

export function otherSide(a: Agreement, me: string): string {
  return same(a.party_a, me) ? a.party_b : same(a.party_b, me) ? a.party_a : "";
}

function noteReason(note: string): string | null {
  const n = pyStrip(note);
  if (pyLen(n) === 0) return REVERTS.noteEmpty;
  if (pyLen(n) > MAX_NOTE_LENGTH) return REVERTS.noteTooLong;
  return null;
}

export type OpenInput = { me: string; other: string; title: string; exists: boolean };

/** open_agreement order: wallet -> title -> reserved -> not yourself -> not opened before. */
export function openBlock(i: OpenInput): string | null {
  if (!i.me) return UI.noWallet;
  const w = walletOrEmpty(i.other);
  if (!w || w === ZERO) return REVERTS.invalidWallet;
  const title = pyStrip(i.title);
  if (pyLen(title) === 0) return REVERTS.titleEmpty;
  if (pyLen(title) > MAX_TITLE_LENGTH) return REVERTS.titleTooLong;
  if (pyContainsToken(title, RESERVED_TOKENS)) return REVERTS.reserved;
  if (same(w, i.me)) return REVERTS.self;
  if (i.exists) return REVERTS.exists;
  return null;
}

/** propose_clause order: side -> LIVE -> text -> reserved -> room -> not proposed before. */
export function proposeBlock(a: Agreement, clauses: Clause[], me: string, text: string, bytes: number): string | null {
  if (!me) return UI.noWallet;
  if (!isSide(a, me)) return REVERTS.sides;
  if (a.state !== "LIVE") return REVERTS.notLive;
  const t = pyStrip(text);
  if (pyLen(t) === 0) return REVERTS.textEmpty;
  if (pyLen(t) > MAX_TEXT_LENGTH) return REVERTS.textTooLong;
  if (pyContainsToken(t, RESERVED_TOKENS)) return REVERTS.reserved;
  if (a.active_count >= MAX_ACTIVE_CLAUSES || a.slot_count >= MAX_CLAUSE_SLOTS) return REVERTS.full;
  const id = clauseIdOf(a.agreement_id, text);
  if (clauses.some((c) => c.clause_id === id)) return REVERTS.proposed;
  if (bytes > 255) return UI.tooManyBytes;
  return null;
}

/** ratify_clause order: side -> not the proposer -> PROPOSED -> LIVE -> the hash of the text shown equals the stored hash. */
export function ratifyBlock(a: Agreement, c: Clause, me: string, read: boolean): string | null {
  if (!me) return UI.noWallet;
  if (!isSide(a, me)) return REVERTS.sides;
  if (same(c.proposer, me)) return REVERTS.otherRatifies;
  if (c.state !== "PROPOSED") return REVERTS.notAwaiting;
  if (a.state !== "LIVE") return REVERTS.notLive;
  if (textHashOf(c.text) !== c.text_hash) return REVERTS.mismatch;
  if (!read) return UI.notRead;
  return null;
}

/** decline_clause order: side -> not the proposer -> PROPOSED. */
export function declineBlock(a: Agreement, c: Clause, me: string): string | null {
  if (!me) return UI.noWallet;
  if (!isSide(a, me)) return REVERTS.sides;
  if (same(c.proposer, me)) return REVERTS.otherRatifies;
  if (c.state !== "PROPOSED") return REVERTS.notAwaiting;
  return null;
}

/** withdraw_clause order: the proposer -> PROPOSED. */
export function withdrawBlock(c: Clause, me: string): string | null {
  if (!me) return UI.noWallet;
  if (!same(c.proposer, me)) return REVERTS.onlyProposer;
  if (c.state !== "PROPOSED") return REVERTS.notAwaiting;
  return null;
}

/** invoke_clause order: side -> RATIFIED -> still invocable -> room -> note. */
export function invokeBlock(a: Agreement, c: Clause, me: string, note: string, bytes: number): string | null {
  if (!me) return UI.noWallet;
  if (!isSide(a, me)) return REVERTS.sides;
  if (c.state !== "RATIFIED") return REVERTS.onlyRatified;
  if (a.state === "CLOSED" && c.fate !== "STANDING") return REVERTS.lapsed;
  if (c.invocations.length >= MAX_INVOCATIONS) return REVERTS.noRoom;
  const n = noteReason(note);
  if (n) return n;
  if (bytes > 255) return UI.tooManyBytes;
  return null;
}

/** acknowledge_invocation / contest_invocation order: side -> index -> not the invoker -> PENDING -> note. */
export function respondBlock(a: Agreement, c: Clause, inv: Invocation, me: string, note: string): string | null {
  if (!me) return UI.noWallet;
  if (!isSide(a, me)) return REVERTS.sides;
  if (inv.index < 1 || inv.index > c.invocations.length) return REVERTS.noSuchInvocation;
  if (same(inv.by, me)) return REVERTS.otherAnswers;
  if (inv.state !== "PENDING") return REVERTS.answered;
  return noteReason(note);
}

/** request_close order: side -> LIVE. */
export function requestCloseBlock(a: Agreement, me: string): string | null {
  if (!me) return UI.noWallet;
  if (!isSide(a, me)) return REVERTS.sides;
  if (a.state !== "LIVE") return REVERTS.notLive;
  return null;
}

/** cancel_close order: side -> CLOSING -> the requester. */
export function cancelCloseBlock(a: Agreement, me: string): string | null {
  if (!me) return UI.noWallet;
  if (!isSide(a, me)) return REVERTS.sides;
  if (a.state !== "CLOSING") return REVERTS.noClose;
  if (!same(a.close_requested_by, me)) return REVERTS.onlyRequester;
  return null;
}

/** confirm_close order: side -> CLOSING -> not the requester. */
export function confirmCloseBlock(a: Agreement, me: string): string | null {
  if (!me) return UI.noWallet;
  if (!isSide(a, me)) return REVERTS.sides;
  if (a.state !== "CLOSING") return REVERTS.noClose;
  if (same(a.close_requested_by, me)) return REVERTS.otherConfirms;
  return null;
}

/** What a confirmed close would do, from state already read. */
export function closeEffect(clauses: Clause[]): { lapsing: Clause[]; standing: Clause[]; voiding: Clause[] } {
  return {
    lapsing: clauses.filter((c) => c.state === "RATIFIED" && c.fate === "LAPSED"),
    standing: clauses.filter((c) => c.state === "RATIFIED" && c.fate === "STANDING"),
    voiding: clauses.filter((c) => c.state === "PROPOSED"),
  };
}
