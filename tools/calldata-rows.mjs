// Shared rows for tools/calldata-bytes.mjs, tools/probe-calldata.mjs and tests.
export const WALLET = "0x" + "1".repeat(40);
export const ID = "f".repeat(64);
export const HASH = "e".repeat(64);
export const NOTE60 = "n".repeat(60);
export const TITLE60 = "t".repeat(60);
export const TEXT140 = "x".repeat(140);

export const CASES = {
  S1: "Confidentiality continues after the arrangement ends.",
  S2: "The indemnity is not affected by termination.",
  S3: "We remain answerable for anything done while the work was live.",
  S4: "Nothing in the closing of this arrangement releases either party from what is already owed.",
  S5: "The audit rights outlast the engagement itself.",
  E1: "The licence lapses when the arrangement ends.",
  E2: "Support stops on the closing date.",
  E3: "Once we close, neither party owes the other anything further.",
  E4: "The exclusivity applies only while the work is live.",
  E5: "Access is withdrawn at termination.",
};

/** HARD BLOCK: every write at its contract maximum must fit in 255 bytes. */
export function hardBlockRows() {
  const rows = Object.entries(CASES).map(([name, text]) => ({
    name: `propose_clause ${name}`, method: "propose_clause", args: [ID, text],
  }));
  rows.push({ name: "propose_clause (id + 140-char text, the contract maximum)", method: "propose_clause", args: [ID, TEXT140] });
  rows.push({ name: "open_agreement (wallet + 60-char title)", method: "open_agreement", args: [WALLET, TITLE60] });
  rows.push({ name: "ratify_clause (id + text hash)", method: "ratify_clause", args: [ID, HASH] });
  rows.push({ name: "decline_clause (id)", method: "decline_clause", args: [ID] });
  rows.push({ name: "withdraw_clause (id)", method: "withdraw_clause", args: [ID] });
  rows.push({ name: "invoke_clause (id + 60-char note)", method: "invoke_clause", args: [ID, NOTE60] });
  rows.push({ name: "acknowledge_invocation (id + index 20 + 60-char note)", method: "acknowledge_invocation", args: [ID, 20, NOTE60] });
  rows.push({ name: "contest_invocation (id + index 20 + 60-char note)", method: "contest_invocation", args: [ID, 20, NOTE60] });
  for (const m of ["request_close", "cancel_close", "confirm_close"]) rows.push({ name: `${m} (id)`, method: m, args: [ID] });
  return rows;
}

/** MEASURE ONLY: non-ASCII text can pass 255 bytes below the character cap; the app blocks it by bytes. */
export function measureOnlyRows() {
  return [
    { name: "propose_clause with 140 two-byte characters", method: "propose_clause", args: [ID, "é".repeat(140)] },
  ];
}
