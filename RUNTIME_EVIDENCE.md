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
| Deploy tx (FINALIZED, constructor) | [`0x27414268…7002c554`](https://explorer-studio.genlayer.com/tx/0x27414268a5d60554c86fd65d6bb2a99a301f2ab42ca17ec8020b6cc67002c554) |
| Source | `contracts/ClauseAccord.py`, SHA-256 in `SOURCE_SHA256.txt` |
| Side A | `0x923a09d0D6e5C242e36C3c1D2071835917cC0bDF` |
| Side B | `0x10AaA763DB250e4856210Dfb91B57780F60e9879` |

Run date 2026-10-07, app at https://after-the-end-chi.vercel.app, MetaMask on StudioNet. **15 transactions** sent from the
app, all FINALIZED with GenVM result SUCCESS and consensus Accepted. Each result below was read back by the app from the
accepted state before it reported success (`src/lib/verify.ts`).

### Agreement 1 — `Website build`

Agreement `4c161c6adabdae5d058617ed490d2907c599e98424163abea0b643cfda0843a5` —
https://after-the-end-chi.vercel.app/?a=4c161c6adabdae5d058617ed490d2907c599e98424163abea0b643cfda0843a5

| # | Wallet | Action in the app | Tx hash | Result |
|---|---|---|---|---|
| 1 | A | Open agreement with B, title `Website build` | [`0x8a8387b0…b0ecd133`](https://explorer-studio.genlayer.com/tx/0x8a8387b07f051d3dbf7d7d1782ca486016e20fa4a1b3d91abc3c2c1bb0ecd133) | **LIVE** |
| 2 | A | Propose S4 `Nothing in the closing of this arrangement releases either party from what is already owed.` | [`0x7de0f592…48d609d9`](https://explorer-studio.genlayer.com/tx/0x7de0f592f86984c6b7564e06b83a046e749c3712a03a7acb4d4e8d4a48d609d9) | **SURVIVES → STANDING**, PROPOSED (clause `35fd2b42…18b404c8`) |
| 3 | A | Propose E1 `The licence lapses when the arrangement ends` | [`0x3d61f48d…6fb0d10c`](https://explorer-studio.genlayer.com/tx/0x3d61f48d58403f0d9ffbcb2dcdf8c38b1aa3c8085175fac3cb03c6fb6fb0d10c) | **DIES_WITH_IT → LAPSED**, PROPOSED (clause `92bad522…1f509c3`) |
| 4 | B | Ratify E1 (signs text hash `07b77b06…1c2926a5`) | [`0xf381833a…cec49b7e`](https://explorer-studio.genlayer.com/tx/0xf381833a7fcd14b174811fdd0ce7b7ff73d491d32f515c935163cf5ccec49b7e) | **RATIFIED**; Lapsed: 1 |
| 5 | B | Propose E2 `Support stops on the closing date.` | [`0x03041370…07594f97`](https://explorer-studio.genlayer.com/tx/0x030413707e77a0aeed5c15321ef7b8ff4126f5141212b2c5973a3a9807594f97) | **DIES_WITH_IT → LAPSED**, PROPOSED (clause `a70f679f…d5b34b42`) |
| 6 | A | Invoke E1 `before close` | [`0x253f4221…cb284aae`](https://explorer-studio.genlayer.com/tx/0x253f422125253c42920d117cda2880c19c68a59b232d6874d3d23fd8cb284aae) | invocation 1 **PENDING** |
| 7 | B | Acknowledge invocation 1 `Noted` | [`0x42214252…1db23235`](https://explorer-studio.genlayer.com/tx/0x42214252b081a2de0d509f41c80e64b9f53d846423400d219f553c091db23235) | **ACKNOWLEDGED** |
| 8 | A | Ask to close (dialog listed E1 to lapse, S4 and E2 to become void) | [`0x78e7204d…c8d82953`](https://explorer-studio.genlayer.com/tx/0x78e7204db15d6de33e3e54e2e32d086ea9f49f1f0434ef8ccb53896ac8d82953) | **CLOSING** — nothing closed yet |
| 9 | B | Confirm close | [`0xb77e6d2f…84898f17`](https://explorer-studio.genlayer.com/tx/0xb77e6d2f474d2adc9540cc509c02a902b974fc7b43823e76e0047ef284898f17) | **CLOSED** (requested by A, confirmed by B); S4 and E2 **VOID**; E1 no longer invocable |

S4 was proposed by A but never ratified by B, so at the close it became **VOID** although its fate was STANDING: a clause
the other side did not sign never binds, whatever the model read. E1 was ratified, so it bound until the close and then
lapsed; its Invoke button is disabled with the contract's sentence *This clause lapsed when the agreement was closed*
(screenshot 3 — a call the app knows will revert is not sent).

### Agreement 2 — `Website build, phase two`

Agreement `b396475c9ec9dcd56398a205c8e9646830d1c4415bdfdf4a3bdb59e43ab98bfc` —
https://after-the-end-chi.vercel.app/?a=b396475c9ec9dcd56398a205c8e9646830d1c4415bdfdf4a3bdb59e43ab98bfc
(the same two wallets, a second agreement under another title).

| # | Wallet | Action in the app | Tx hash | Result |
|---|---|---|---|---|
| 10 | A | Open agreement with B, title `Website build, phase two` | [`0x7691053f…972514a8`](https://explorer-studio.genlayer.com/tx/0x7691053f9b6a4d1611345dc5d026f2951166ec38761e2b57652be0bb972514a8) | **LIVE** |
| 11 | A | Propose S4 (same text as row 2) | [`0x09904fac…2c5bdeb0`](https://explorer-studio.genlayer.com/tx/0x09904fac733b4221824f384cad3bbc95d7bc5807887104fa9e4bb4af2c5bdeb0) | **SURVIVES → STANDING** again, PROPOSED (clause `02aeed1f…aca83038`) |
| 12 | B | Ratify S4 (signs text hash `bb818a9b…2ced60ba`) | [`0xc4832899…00657f8b`](https://explorer-studio.genlayer.com/tx/0xc48328993b3ae16c18c87009505b9987361efe13775656e337d7db9e00657f8b) | **RATIFIED**; Standing: 1 |
| 13 | A | Ask to close | [`0xd341ff4c…d0ac99d3`](https://explorer-studio.genlayer.com/tx/0xd341ff4c645af97927d63df93181722d404af8ada256f8dce315edd0d0ac99d3) | **CLOSING** |
| 14 | B | Confirm close | [`0xea5e8a22…17f60376`](https://explorer-studio.genlayer.com/tx/0xea5e8a2297beb4918f6e2278cc25f40cf79061e5a20fe8952fdca1b917f60376) | **CLOSED**; S4 *stands after the close* |
| 15 | B | Invoke S4 `after close` | [`0xb0a3a55a…8d10ca25`](https://explorer-studio.genlayer.com/tx/0xb0a3a55a67d8ccea2f432afd71b45699085e27b2941ef86eda4fd6728d10ca25) | **success after the close**: invocation 1 PENDING, waiting for A's answer |

Together: after a close both sides signed, the ratified STANDING clause is still invocable (row 15) and the ratified
LAPSED clause is not (row 9, screenshot 3). S4 got the same reading on both proposals (rows 2 and 11).

### Screenshots (`docs/evidence/`)

1. `docs/evidence/1-before-close.png` — agreement 1 seen by B before the close: S4 and E2 *Proposed — binds nothing until
   the other side ratifies*, E1 *Ratified by both sides*; B sees Ratify/Decline on A's proposal and Withdraw on its own.
2. `docs/evidence/2-close-dialog.png` — A's *Ask to close* dialog: E1 will lapse, S4 and E2 will become void, nothing
   closes until B confirms.
3. `docs/evidence/3-after-close.png` — agreement 1 CLOSED by both sides: E1's Invoke disabled with the contract's
   sentence; S4 and E2 void.
4. `docs/evidence/4-standing-after-close.png` — agreement 2 CLOSED: S4 *stands after the close; it is still open to
   invoke*, with the invocation made after the close.

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
