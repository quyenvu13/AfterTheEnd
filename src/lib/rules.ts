// Mirrors every revert of contracts/SurvivalGate.py that can be predicted from
// state already read, in the SAME order the contract checks them. A button
// whose action would revert is disabled and shows the contract's exact
// sentence. Only the model's label is unpredictable, so only record_clause
// with all checks passing is ever sent.

import { pyContainsToken, pyLen, pyStrip } from "./pytext.ts";
import type { Agreement, Clause, Invocation } from "./types.ts";

export const MAX_TEXT_LENGTH = 600;
export const MAX_LABEL_LENGTH = 80;
export const MAX_NOTE_LENGTH = 60;
export const MAX_CLAUSES_PER_AGREEMENT = 20;
export const MAX_INVOCATIONS = 20;

export const RESERVED_TOKENS = [
  "<UNTRUSTED_CLAUSE_TEXT>",
  "</UNTRUSTED_CLAUSE_TEXT>",
  "<UNTRUSTED_OTHER_SIDE_LABEL>",
  "</UNTRUSTED_OTHER_SIDE_LABEL>",
  "SURVIVES",
  "DIES_WITH_IT",
] as const;

export const REVERTS = {
  invalidWallet: "Invalid wallet address",
  labelEmpty: "Label is empty",
  labelTooLong: "Label is too long",
  textEmpty: "Text is empty",
  textTooLong: "Text is too long",
  noteEmpty: "Note is empty",
  noteTooLong: "Note is too long",
  reserved: "Text or label contains a reserved token",
  unknownClause: "Unknown clause id",
  otherIsAuthor: "The other side cannot be the author",
  recordAfterClose: "This agreement is closed; no further clauses can be recorded",
  agreementFull: "This agreement is full",
  duplicateClause: "This clause already exists in this agreement",
  invokeNotSide: "Only the two named sides may invoke a clause",
  lapsed: "This clause lapsed when the agreement was closed",
  invocationsFull: "No room for further invocations",
  unknownAgreement: "Unknown agreement",
  alreadyClosed: "This agreement is already closed",
  contestNotSide: "Only the two named sides may contest an invocation",
  noSuchInvocation: "No such invocation",
  contestOwn: "Only the other side may contest this invocation",
  alreadyContested: "This invocation has already been contested",
} as const;

/** Panel sentence for a STANDING clause after close (not a revert). */
export const STANDS_AFTER_CLOSE = "This clause stands after the close; it is still open to invoke";

const ZERO = "0x0000000000000000000000000000000000000000";

export type WalletCheck = { ok: true; wallet: string } | { ok: false; reason: string };

/** The contract's _normalize_wallet. */
export function normalizeWallet(value: string): WalletCheck {
  const wallet = pyStrip(value).toLowerCase();
  if (wallet.length !== 42 || !wallet.startsWith("0x") || !/^[0-9a-f]{40}$/.test(wallet.slice(2)) || wallet === ZERO) {
    return { ok: false, reason: REVERTS.invalidWallet };
  }
  return { ok: true, wallet };
}

function noteBlock(note: string): string | null {
  const n = pyStrip(note);
  if (pyLen(n) === 0) return REVERTS.noteEmpty;
  if (pyLen(n) > MAX_NOTE_LENGTH) return REVERTS.noteTooLong;
  return null;
}

export function isSide(agreement: Pick<Agreement, "author" | "other_wallet">, me: string): boolean {
  const who = me.toLowerCase();
  return who !== "" && (who === agreement.author.toLowerCase() || who === agreement.other_wallet.toLowerCase());
}

/** The contract's _is_invocable — used only to decide which panel sentence to show. */
export function isInvocable(agreementState: string, fate: string): boolean {
  return agreementState !== "CLOSED" || fate === "STANDING";
}

export type RecordInput = {
  me: string;
  otherWallet: string;
  label: string;
  text: string;
  agreement: Agreement | null;   // null when the agreement does not exist yet
  clauseExists: boolean;         // from the accepted-state probe get_clause(localId)
};

/** record_clause order: wallet -> label -> text -> reserved -> author -> closed -> full -> duplicate. */
export function recordBlock(input: RecordInput): string | null {
  const w = normalizeWallet(input.otherWallet);
  if (!w.ok) return w.reason;
  const label = pyStrip(input.label);
  if (pyLen(label) === 0) return REVERTS.labelEmpty;
  if (pyLen(label) > MAX_LABEL_LENGTH) return REVERTS.labelTooLong;
  const text = pyStrip(input.text);
  if (pyLen(text) === 0) return REVERTS.textEmpty;
  if (pyLen(text) > MAX_TEXT_LENGTH) return REVERTS.textTooLong;
  if (pyContainsToken(label, RESERVED_TOKENS) || pyContainsToken(text, RESERVED_TOKENS)) return REVERTS.reserved;
  if (w.wallet === input.me.toLowerCase()) return REVERTS.otherIsAuthor;
  if (input.agreement) {
    if (input.agreement.state !== "LIVE") return REVERTS.recordAfterClose;
    if (input.agreement.clause_count >= MAX_CLAUSES_PER_AGREEMENT) return REVERTS.agreementFull;
  }
  if (input.clauseExists) return REVERTS.duplicateClause;
  return null;
}

/** invoke_clause order: side -> fate after close -> room -> note. */
export function invokeBlock(agreement: Agreement, clause: Clause, me: string, note: string): string | null {
  if (!isSide(agreement, me)) return REVERTS.invokeNotSide;
  if (!isInvocable(agreement.state, clause.fate)) return REVERTS.lapsed;
  if (clause.invocation_count >= MAX_INVOCATIONS) return REVERTS.invocationsFull;
  return noteBlock(note);
}

/** close_agreement: the id is derived from the caller, so a non-side never finds it. */
export function closeBlock(agreement: Agreement | null, me: string): string | null {
  if (!agreement || !isSide(agreement, me)) return REVERTS.unknownAgreement;
  if (agreement.state !== "LIVE") return REVERTS.alreadyClosed;
  return null;
}

/** contest_invocation order: side -> index -> not the invoker -> not yet contested -> note. */
export function contestBlock(
  agreement: Agreement,
  clause: Clause,
  invocation: Invocation | null,
  index: number,
  me: string,
  note: string,
): string | null {
  if (!isSide(agreement, me)) return REVERTS.contestNotSide;
  if (index < 1 || index > clause.invocation_count || !invocation) return REVERTS.noSuchInvocation;
  if (invocation.by.toLowerCase() === me.toLowerCase()) return REVERTS.contestOwn;
  if (invocation.contested) return REVERTS.alreadyContested;
  return noteBlock(note);
}

/** Which sentence the clause row shows. Null while the agreement is live. */
export function fateSentence(agreementState: string, fate: string): string | null {
  if (agreementState !== "CLOSED") return null;
  return isInvocable(agreementState, fate) ? STANDS_AFTER_CLOSE : REVERTS.lapsed;
}
