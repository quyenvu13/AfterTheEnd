// Shared rows for tools/calldata-bytes.mjs, tools/probe-calldata.mjs and tests.
export const OTHER = "0x" + "1".repeat(40);
export const AUTHOR = "0x" + "2".repeat(40);
export const LABEL = "the other side";
export const ID = "f".repeat(64);
export const NOTE60 = "n".repeat(60);

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

/** HARD BLOCK: any of these over 255 bytes stops the release. */
export function hardBlockRows() {
  const rows = Object.entries(CASES).map(([name, text]) => ({
    name: `record_clause ${name}`, method: "record_clause", args: [OTHER, LABEL, text],
  }));
  rows.push({ name: "invoke_clause (id + 60-char note)", method: "invoke_clause", args: [ID, NOTE60] });
  rows.push({ name: "contest_invocation (id + index 20 + 60-char note)", method: "contest_invocation", args: [ID, 20, NOTE60] });
  rows.push({ name: "close_agreement (wallet)", method: "close_agreement", args: [AUTHOR] });
  return rows;
}

/** MEASURE ONLY: the contract caps are wider than the proven calldata path. */
export function measureOnlyRows() {
  return [
    { name: "record_clause at max label 80 + max text 600", method: "record_clause", args: [OTHER, "l".repeat(80), "t".repeat(600)] },
  ];
}
