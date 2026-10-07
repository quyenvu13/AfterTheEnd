// The Project's own deployment of the two-party ClauseAccord source (2.0; the 1.0
// SurvivalGate deployments stay on record in RUNTIME_EVIDENCE.md). VITE_CONTRACT_ADDRESS
// overrides it, e.g. to point a fork at another deployment.
export const PROJECT_DEPLOYMENT = "0xC32AE2297C3bAB48DD5C19E7Ea126E2b03d83451";
export const CONTRACT_ADDRESS = (String(import.meta.env.VITE_CONTRACT_ADDRESS ?? "").trim() || PROJECT_DEPLOYMENT) as `0x${string}` | "";

// Same-origin proxy declared in BOTH vite.config.ts and vercel.json.
// Every read, every receipt poll and the write client use this one URL.
export const RPC_PATH = "/genlayer-rpc";

export const STUDIONET_CHAIN_ID = 61999;
export const STUDIONET_CHAIN_HEX = "0xf22f";
// Only used when MetaMask must add the network (wallet_addEthereumChain needs an absolute URL).
export const WALLET_ADD_RPC = "https://studio.genlayer.com/api";
export const EXPLORER_BASE = "https://explorer-studio.genlayer.com";

export const SOURCE_SHA256 = "9e84c65c9fb33c96f2d04dd049d945128952fd5166189e450f5f9a36bd734feb";

export const RECEIPT_TIMEOUT_MS = 150_000;
export const RECEIPT_POLL_MS = 3_000;
