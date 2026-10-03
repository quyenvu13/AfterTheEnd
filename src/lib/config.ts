// The Project's own deployment of the frozen SurvivalGate source (a separate
// address from the Intelligent Contract submission). VITE_CONTRACT_ADDRESS
// overrides it, e.g. to point a fork at another deployment.
export const PROJECT_DEPLOYMENT = "0x4fE214a0a79888c3bA8639976Ec4Ed4b08861B2A";
export const CONTRACT_ADDRESS = (String(import.meta.env.VITE_CONTRACT_ADDRESS ?? "").trim() || PROJECT_DEPLOYMENT) as `0x${string}`;

// Same-origin proxy declared in BOTH vite.config.ts and vercel.json.
// Every read, every receipt poll and the write client use this one URL.
export const RPC_PATH = "/genlayer-rpc";

export const STUDIONET_CHAIN_ID = 61999;
export const STUDIONET_CHAIN_HEX = "0xf22f";
// Only used when MetaMask must add the network (wallet_addEthereumChain needs an absolute URL).
export const WALLET_ADD_RPC = "https://studio.genlayer.com/api";
export const EXPLORER_BASE = "https://explorer-studio.genlayer.com";

export const RECEIPT_TIMEOUT_MS = 60_000;
export const RECEIPT_POLL_MS = 3_000;
