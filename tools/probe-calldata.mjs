// Confirms on the real StudioNet RPC that each calldata shape is DECODED by the
// node (no "RLP string ends with N superfluous bytes"). Uses gen_call write
// simulation, no wallet, no transaction. Every row is built to stop at a
// deterministic revert AFTER decoding, so no model call is made:
//   record_clause is sent FROM the "other side" wallet -> "The other side cannot be the author"
//   invoke / contest use an unknown id                 -> "Unknown clause id"
//   close_agreement from an unrelated wallet           -> "Unknown agreement"
//
//   node tools/probe-calldata.mjs <contract_address> [rpc_url]
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { hardBlockRows, measureOnlyRows, OTHER } from "./calldata-rows.mjs";

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

let failed = 0;
for (const [group, rows] of [["HARD BLOCK", hardBlockRows()], ["MEASURE ONLY", measureOnlyRows()]]) {
  console.log(group);
  for (const r of rows) {
    let verdict;
    try {
      await client.simulateWriteContract({ address, functionName: r.method, args: r.args, account: { address: OTHER } });
      verdict = "decoded (call returned)";
    } catch (e) {
      const t = text(e);
      verdict = /superfluous bytes/i.test(t) ? "CLIFF: " + t.slice(0, 120) : "decoded, reverted: " + t.slice(0, 120);
    }
    if (group === "HARD BLOCK" && verdict.startsWith("CLIFF")) failed += 1;
    console.log(`  ${r.name}\n      ${verdict}`);
  }
}
process.exit(failed ? 1 : 0);
