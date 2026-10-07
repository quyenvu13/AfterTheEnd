import { keccak256, stringToBytes } from "viem";
import { pyLen, pyNormalize, pyStrip } from "./pytext.ts";

// Keccak-256 (Ethereum), not NIST SHA3-256. Same payloads as the contract:
//   agreement id = keccak256("CLAUSE_ACCORD:AGREEMENT:V1|" + a + "|" + b + "|" + len(t) + "|" + t)
//   clause id    = keccak256("CLAUSE_ACCORD:CLAUSE:V1|" + agreement_id + "|" + len(t) + "|" + t)
//   text hash    = keccak256(t)
// where t is Python-stripped with whitespace collapsed, and a, b are lower-case wallets
// (a = the wallet that opened the agreement).
export function normText(text: string): string {
  return pyNormalize(pyStrip(text));
}

const k = (s: string) => keccak256(stringToBytes(s)).slice(2);

export function agreementIdOf(partyA: string, partyB: string, title: string): string {
  const t = normText(title);
  return k("CLAUSE_ACCORD:AGREEMENT:V1|" + partyA.toLowerCase() + "|" + partyB.toLowerCase() + "|" + pyLen(t) + "|" + t);
}

export function clauseIdOf(agreementId: string, text: string): string {
  const t = normText(text);
  return k("CLAUSE_ACCORD:CLAUSE:V1|" + agreementId + "|" + pyLen(t) + "|" + t);
}

/** What the other side signs when ratifying: the hash of the exact text they read. */
export function textHashOf(text: string): string {
  return k(normText(text));
}

/** Every 64-hex id found in a bare id, a 0x id, a link or a comma list. */
export function idsFromInput(value: string): string[] {
  const out: string[] = [];
  for (const m of value.matchAll(/(?<![0-9a-fA-F])([0-9a-fA-F]{64})(?![0-9a-fA-F])/g)) {
    const id = m[1].toLowerCase();
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

export function short(value: string, head = 6, tail = 4): string {
  if (!value || value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}
