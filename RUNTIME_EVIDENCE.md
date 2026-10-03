# RUNTIME_EVIDENCE — AfterTheEnd

Network: GenLayer StudioNet, chain 61999. Contract source: `contracts/SurvivalGate.py`, SHA-256 in
`SOURCE_SHA256.txt` (the same frozen file as the SurvivalGate Intelligent Contract submission).

| Deployment | Address |
|---|---|
| **This Project** | [`0x4fE214a0a79888c3bA8639976Ec4Ed4b08861B2A`](https://explorer-studio.genlayer.com/address/0x4fE214a0a79888c3bA8639976Ec4Ed4b08861B2A) |
| Intelligent Contract submission (separate address, not reused here) | [`0x294667415F31825ddC29f986B47c3dE747c1ff85`](https://explorer-studio.genlayer.com/address/0x294667415F31825ddC29f986B47c3dE747c1ff85) — its 11-transaction run is in the SurvivalGate repository |

Every row: wallet, action, expected, tx hash, result read back. A row not run says **NOT RUN**. A screenshot
or a FINALIZED status alone is not evidence of execution.

## Project run — 5 transactions through the app

Live app: _(Vercel URL)_

| Step | Wallet | Action in the app | Expected | Tx hash | Result | Status |
|---|---|---|---|---|---|---|
| 1 | author | record S4 | STANDING | | | NOT RUN |
| 2 | author | record E3 | LAPSED | | | NOT RUN |
| 3 | other | invoke E3 (before close) | success | | | NOT RUN |
| 4 | other | close agreement (dialog, type CLOSE) | CLOSED | | | NOT RUN |
| 5 | other | invoke S4 (after close) | success | | | NOT RUN |

S4 = `Nothing in the closing of this arrangement releases either party from what is already owed.`
E3 = `Once we close, neither party owes the other anything further.`

The revert after the close (invoking E3) is **not** sent from the app: the button is disabled with the
contract's sentence. Screenshot 3 is its evidence.

## Screenshots (`docs/evidence/`)

1. `1-before-close.png` — the register before the close: both Invoke buttons enabled, banner LIVE,
   `Standing: 1 · Lapsed: 1` — NOT RUN
2. `2-close-dialog.png` — the close dialog listing the LAPSED clause by text, with the CLOSE field — NOT RUN
3. `3-after-close.png` — the same register after the close: banner CLOSED with closed_by / closed_at, the
   STANDING button enabled with *This clause stands after the close; it is still open to invoke*, the LAPSED
   button disabled with *This clause lapsed when the agreement was closed*, the step-3 invocation still
   listed — NOT RUN
