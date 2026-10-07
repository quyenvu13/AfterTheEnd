# RUNTIME_EVIDENCE — AfterTheEnd

```
COMPILE PASS ≠ RUNTIME PASS
SUBMITTED ≠ ACCEPTED ≠ FINALIZED ≠ EXECUTION SUCCESS ≠ POSTCONDITION PASS
```

Network: GenLayer StudioNet, chain 61999. Every row: wallet, action, tx hash, result read back from the
accepted state. A row not run says **NOT RUN**. A screenshot or a FINALIZED status alone is not evidence of execution.

## 2.0 — ClauseAccord (two-party), through this app

| | |
|---|---|
| Contract | [`0xC32AE2297C3bAB48DD5C19E7Ea126E2b03d83451`](https://explorer-studio.genlayer.com/address/0xC32AE2297C3bAB48DD5C19E7Ea126E2b03d83451) |
| Deploy tx | [`0x27414268…7002c554`](https://explorer-studio.genlayer.com/tx/0x27414268a5d60554c86fd65d6bb2a99a301f2ab42ca17ec8020b6cc67002c554) |
| Source | `contracts/ClauseAccord.py`, SHA-256 in `SOURCE_SHA256.txt` |
| Side A | `0x923a09d0D6e5C242e36C3c1D2071835917cC0bDF` |
| Side B | `0x10AaA763DB250e4856210Dfb91B57780F60e9879` |

Run: **NOT RUN yet.** Planned rows:

| # | Wallet | Action in the app | Expected | Tx hash | Result |
|---|---|---|---|---|---|
| 1 | A | Open agreement with B, title `Website build` | LIVE | NOT RUN | |
| 2 | A | Propose S4 | PROPOSED · STANDING | NOT RUN | |
| 3 | A | Propose E1 | PROPOSED · LAPSED | NOT RUN | |
| 4 | B | Ratify S4 (text hash) | RATIFIED | NOT RUN | |
| 5 | B | Ratify E1 (text hash) | RATIFIED | NOT RUN | |
| 6 | B | Propose E2, left unratified | PROPOSED · LAPSED | NOT RUN | |
| 7 | A | Invoke E1 `before close` | PENDING | NOT RUN | |
| 8 | B | Acknowledge invocation 1 `Noted` | ACKNOWLEDGED | NOT RUN | |
| 9 | A | Ask to close | CLOSING | NOT RUN | |
| 10 | B | Confirm close | CLOSED; E2 VOID; E1 not invocable | NOT RUN | |
| 11 | B | Invoke S4 `after close` | PENDING | NOT RUN | |


## 1.0 — SurvivalGate (single-signature model, replaced by 2.0)

| Deployment | Address |
|---|---|
| 1.0 Project | [`0x4fE214a0a79888c3bA8639976Ec4Ed4b08861B2A`](https://explorer-studio.genlayer.com/address/0x4fE214a0a79888c3bA8639976Ec4Ed4b08861B2A) |
| SurvivalGate Intelligent Contract submission | [`0x294667415F31825ddC29f986B47c3dE747c1ff85`](https://explorer-studio.genlayer.com/address/0x294667415F31825ddC29f986B47c3dE747c1ff85) — its 11-transaction run is in the SurvivalGate repository |

### 1.0 Project run — SurvivalGate, transactions through the app

Live app: https://after-the-end-chi.vercel.app · author `0x923a09d0D6e5C242e36C3c1D2071835917cC0bDF` · other side `0x10AaA763DB250e4856210Dfb91B57780F60e9879` · agreement `55e908671060967ec80c8277e086660f6563f3c7215748f7c7604a67a10e1551`

| Step | Wallet | Action in the app | Expected | Tx hash | Result | Status |
|---|---|---|---|---|---|---|
| 1 | author | record S4 | STANDING | `0x5f42a800df0e15af6ca6115ac5e43a9654aa39fa0d1d264e63a1c019401b8298` | executed; app verified accepted state: **STANDING** | PASS |
| 2 | author | record E3 | LAPSED | `0xf8b4c454d4e002c94adc97eb159b3136f8fc385ef204b6da57e50d2822993507` | executed; **STANDING** — differs from the Intelligent Contract run, see note | MISMATCH (recorded as is) |
| 3 | author | record E1 | LAPSED | `0xbef379ea8242e7761e1eb6be7d2b92f6fd9db9ed00e754b02aa8af70721043ab` | executed; **LAPSED**; agreement `Standing: 2 · Lapsed: 1` | PASS |
| 4 | other | invoke E1 (before close) | success | `0xdbec58538de494e3fa299382c982a7c15d66721cc282026e7e46d751bbbaf9bd` | executed; invocation 1 by `0x10aa…9879` | PASS |
| 5 | other | close agreement (dialog, type CLOSE) | CLOSED | `0x1b2fa1ea4b80c2584e4098199287edc36eeadbe6e3bbc086903db7643e7ee0c9` | executed; CLOSED by `0x10aa…9879` at `2026-10-03T16:36:01.076416Z` | PASS |
| 6 | other | invoke S4 (after close) | success | `0x7024049b45f8cea7811f9fd459f608516e5311da11103aed7f97d7eeb375e997` | executed; invocation 1 on S4 `after close` | PASS |

**Note on 1.0 step 2.** E3 was labelled `DIES_WITH_IT` on the Intelligent Contract deployment, where it was accepted
only after one leader rotation, and `SURVIVES` here. The same sentence received both labels on two runs, so
E3 is a borderline case for the current validator set and its label is not stable. It is recorded as it came
out; the rubric was not changed. Because E3 is now a STANDING clause in this agreement, the demonstration of a
lapsing clause uses E1.

S4 = `Nothing in the closing of this arrangement releases either party from what is already owed.`
E3 = `Once we close, neither party owes the other anything further.`
E1 = `The licence lapses when the arrangement ends.`

The revert after the close (invoking the LAPSED clause) is **not** sent from the app: the button is disabled with the
contract's sentence. Screenshot 3 is its evidence.

### 1.0 screenshots

1. `docs/evidence/v1-1-before-close.png` — the register before the close: all three Invoke buttons enabled, banner LIVE,
   `Standing: 2 · Lapsed: 1` — taken
2. `docs/evidence/v1-2-close-dialog.png` — the close dialog listing the LAPSED clause by text, with the CLOSE field — taken (the red line under the dialog is from an earlier signature the wallet rejected; nothing was sent)
3. `docs/evidence/v1-3-after-close.png` — the same register after the close: banner CLOSED with closed_by / closed_at, the
   STANDING button enabled with *This clause stands after the close; it is still open to invoke*, the LAPSED
   button disabled with *This clause lapsed when the agreement was closed*, the step-3 invocation still
   listed — taken
