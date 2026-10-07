// Confirms on the real StudioNet RPC that each calldata shape is DECODED by the
// node (no "RLP string ends with N superfluous bytes"). A row counts as decoded
// when the call returns, the contract's sentence comes back, or the node reports
// "execution failed" (StudioNet gen_call does not return the sentence). A network
// error or no answer fails the job. gen_call write simulation only: no wallet, no
// transaction, nothing stored. No row reaches the model:
//   open_agreement names the sending wallet itself -> "The other side cannot be yourself"
//   propose_clause and the close methods use an unknown agreement id -> "Unknown agreement"
//   ratify / decline / withdraw / invoke / answer use an unknown clause id -> "Unknown clause id"
//
// The public RPC allows about 30 requests per minute, so rows are spaced out and a
// rate-limit answer is waited out and retried instead of counted as a failure.
//
//   node tools/probe-calldata.mjs <contract_address> [rpc_url]
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { hardBlockRows, measureOnlyRows, WALLET } from "./calldata-rows.mjs";

const address = process.argv[2];
const rpc = process.argv[3] || "https://studio.genlayer.com/api";
if (!/^0x[0-9a-fA-F]{40}$/.test(address || "")) {
  console.error("usage: node tools/probe-calldata.mjs <contract_address> [rpc_url]");
  process.exit(2);
}
const client = createClient({ chain: { ...studionet, rpcUrls: { default: { http: [rpc] } } } });

function text(e) {
  const out = [];
  const walk = (v, d = 0) => {
    if (!v || d > 8) return;
    if (typeof v === "string") return out.push(v);
    if (typeof v === "object") for (const k of ["message", "shortMessage", "details", "cause", "data"]) walk(v[k], d + 1);
  };
  walk(e);
  return out.join(" | ");
}

const EXPECTED = ["Unknown agreement", "Unknown clause id", "The other side cannot be yourself"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SPACING_MS = 2500;
const RATE_WAIT_MS = 65_000;

async function simulate(r) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await client.simulateWriteContract({ address, functionName: r.method, args: r.args, account: { address: WALLET } });
      return null;
    } catch (e) {
      const t = text(e);
      if (/rate limit/i.test(t) && attempt < 3) {
        console.log(`      rate limited, waiting ${RATE_WAIT_MS / 1000}s`);
        await sleep(RATE_WAIT_MS);
        continue;
      }
      return t;
    }
  }
}

let failed = 0;
for (const [group, rows] of [["HARD BLOCK", hardBlockRows()], ["MEASURE ONLY", measureOnlyRows()]]) {
  console.log(group);
  for (const r of rows) {
    await sleep(SPACING_MS);
    let verdict;
    const t = await simulate(r);
    if (t === null) {
      verdict = "decoded (call returned)";
    } else if (/superfluous bytes/i.test(t)) {
      verdict = "CLIFF: " + t.slice(0, 120);
    } else if (EXPECTED.some((x) => t.includes(x))) {
      verdict = "decoded, reverted with the contract's own sentence";
    } else if (/execution failed/i.test(t)) {
      verdict = "decoded, execution failed on the node (StudioNet gen_call does not return the sentence)";
    } else {
      verdict = "NOT REACHED (the node did not answer): " + t.slice(0, 120);
    }
    if (group === "HARD BLOCK" && !verdict.startsWith("decoded")) failed += 1;
    console.log(`  ${r.name}\n      ${verdict}`);
  }
}
process.exit(failed ? 1 : 0);
