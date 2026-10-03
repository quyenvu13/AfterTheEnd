import { keccak256, stringToBytes } from "viem";
import { pyLen, pyNormalize, pyStrip } from "./pytext.ts";

// Keccak-256 (Ethereum), not NIST SHA3-256. Same payloads as the contract.

export function agreementId(authorWallet: string, otherWallet: string): string {
  const payload = "SURVIVAL_GATE:AGREEMENT:V1|" + authorWallet.toLowerCase() + "|" + otherWallet.toLowerCase();
  return keccak256(stringToBytes(payload)).slice(2);
}

export function clauseId(agreementIdHex: string, text: string): string {
  const normalized = pyNormalize(pyStrip(text));
  const payload = "SURVIVAL_GATE:CLAUSE:V1|" + agreementIdHex + "|" + String(pyLen(normalized)) + "|" + normalized;
  return keccak256(stringToBytes(payload)).slice(2);
}

export function short(value: string, head = 6, tail = 4): string {
  if (!value || value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}
