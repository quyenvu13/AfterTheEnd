AfterTheEnd does not ask whether a clause is valid, and it does not check a clause against a policy. It asks one thing: when the two sides close the agreement, does this clause reach past that moment or stop at it? A clause counts only once **both sides** have signed it, and the agreement closes only when **both sides** sign the close. Then the register splits along that line.

<p align="center"><img src="logo.png" alt="AfterTheEnd logo" width="128"></p>

<p align="center"><img src="docs/evidence/v1-1-before-close.png" alt="Before the close" width="45%"> <img src="docs/evidence/v1-3-after-close.png" alt="After the close" width="45%"></p>

# AfterTheEnd

A dApp on GenLayer StudioNet (chain 61999) built on the two-party `ClauseAccord` contract
(`contracts/ClauseAccord.py`, py-genlayer v0.2). Version 2.0; what changed from 1.0 is in `CHANGELOG.md`.

| | |
|---|---|
| Live app | https://after-the-end-chi.vercel.app |
| Contract (this Project's deployment) | [`0xC32AE2297C3bAB48DD5C19E7Ea126E2b03d83451`](https://explorer-studio.genlayer.com/address/0xC32AE2297C3bAB48DD5C19E7Ea126E2b03d83451) |
| Source | frozen; SHA-256 in `SOURCE_SHA256.txt`, checked in CI |
| Semantic core | the SurvivalGate rubric, verbatim (rubric hash `4cec8967…7f6c16`) — [github.com/quyenvu13/SurvivalGate](https://github.com/quyenvu13/SurvivalGate) |

## How it works — nothing counts on one side's word

- **Agreement.** One wallet opens it with a title and names the other wallet. The same two wallets can
  open another agreement under another title.
- **Proposal.** Either side proposes a clause (up to 140 characters). Validators read **only the clause
  text**, once: `SURVIVES` (still holds after the close) → fate `STANDING`, or `DIES_WITH_IT` (stops at
  the close) → fate `LAPSED`. The proposal binds nothing yet.
- **Ratification.** Only the **other** side can make it bind: `ratify_clause` signs the keccak256 hash of
  the exact text they read, together with its frozen fate. They can `decline_clause` instead, and the
  proposer can `withdraw_clause` while it is waiting. A declined or withdrawn proposal frees its place.
- **Invocation.** Either side invokes a ratified clause with a short note; the **other** side answers it
  once — `acknowledge_invocation` or `contest_invocation`, with a note.
- **Two-signature close.** One side calls `request_close` (the agreement becomes `CLOSING`; the requester
  can `cancel_close`); the other side calls `confirm_close`. At that moment proposals still waiting become
  `VOID`, `STANDING` clauses stay invocable and `LAPSED` clauses revert with
  *"This clause lapsed when the agreement was closed"* — for good. Nothing new can be proposed or ratified
  once a close has been requested.

**The contract holds no funds.** It moves no money, enforces nothing off-chain and is not an escrow.

## How to try it

You need **two wallets** of your own (A and B). Only fees are spent.

1. Open the app, connect MetaMask with wallet A (it switches to StudioNet; no Snap is needed). In
   **New agreement** enter wallet B and a title, then **Open agreement**. Click **Copy agreement link**.
2. Still as A, propose two clauses, for example
   `Nothing in the closing of this arrangement releases either party from what is already owed.` and
   `The licence lapses when the arrangement ends.` Each row shows the validators' fate and
   *Proposed — binds nothing until the other side ratifies this exact text*.
3. Switch MetaMask to wallet B and open the link. Tick *I read this exact clause…* on each row and
   **Ratify** (or **Decline**). Wallet A sees no Ratify button on its own proposals.
4. Invoke a clause from one wallet; answer it from the other (**Acknowledge** or **Contest**).
5. **Ask to close…** from one wallet: the dialog lists the clauses that will lapse and the proposals that
   will become void, and asks you to type `CLOSE`. The banner turns `CLOSING` — nothing has closed yet.
6. From the other wallet, **Confirm close…**. The banner turns `CLOSED`; the `STANDING` row keeps an
   active **Invoke**, the `LAPSED` row's button is disabled with the contract's own sentence.

Clause text may not contain `SURVIVES` or `DIES_WITH_IT` in any letter case (the model's answer tokens).
The UI never sends a transaction it already knows will revert: the button is disabled with the
contract's exact sentence. A live meter blocks any text over the 255-byte calldata limit.

## Honest limitations

1. **The contract holds no money and enforces nothing off-chain.** It records which clauses both sides
   signed, which of them can still be invoked after a close both sides signed, and every invocation with
   its answer.
2. **An invocation is a statement, not a proof.** The other side's answer is recorded next to it; nobody
   verifies the facts behind either.
3. **The fate comes from the model and is frozen at proposal.** The other side sees it before ratifying
   and can decline a clause whose fate it does not accept; a borderline sentence can be read differently
   on two runs (see E3 in `RUNTIME_EVIDENCE.md`). Unclear or unparseable output is read as `SURVIVES`,
   so a clause never lapses on a guess.
4. **A confirmed close cannot be undone,** by design: it takes both signatures, the confirming side sees
   the full list of clauses that will lapse or become void, and invocations of `STANDING` clauses and
   answers to past invocations keep working after it.
5. **Caps:** 20 waiting-or-ratified clauses and 40 proposals ever per agreement, 20 invocations per
   clause. A full agreement does not close itself; the two sides can open another one under another title.

## Repository

| Path | What |
|---|---|
| `contracts/ClauseAccord.py` | the contract (frozen; SHA-256 in `SOURCE_SHA256.txt`) |
| `LOCKED_SPEC.md` | the design that must not change |
| `TEST_PLAN.md` / `TESTING.md` | cases, what is automated, what was run by hand, what is not proven |
| `RUNTIME_EVIDENCE.md` | StudioNet transactions, one hash per row (2.0 and the earlier 1.0 runs) |
| `tests/contract/` | Direct Mode tests on the real py-genlayer SDK (model mocked) and the mutation list |
| `tests/js/` | frontend logic tests (Python parity, ids, revert mirroring, receipts, postconditions, retry path) |
| `tools/` | calldata size table, RPC calldata probe, source hash check, mutation runner |
| `CLAUSEACCORD_KILLSET_CHECK.py` | gate: no token separates the test classes; rubric shares no word with them |

Run locally: `npm ci && npm run build && npm test && npm run verify:source`, and
`python3 -m pytest tests/contract -q` (Python 3.12+, `genlayer-test==0.29.2`).

Deployment: the app talks to the address in `src/lib/config.ts` (also listed in `deployments.json`);
`VITE_CONTRACT_ADDRESS` overrides it for a fork.

License: MIT.
