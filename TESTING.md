# TESTING

```
COMPILE PASS ≠ RUNTIME PASS
SUBMITTED ≠ ACCEPTED ≠ FINALIZED ≠ EXECUTION SUCCESS ≠ POSTCONDITION PASS
```

## Run automatically (offline, also in CI)

| Gate | Command | Result |
|---|---|---|
| kill-set + rubric overlap | `python3 CLAUSEACCORD_KILLSET_CHECK.py contracts/ClauseAccord.py` | NO LEAK + PASS, rc 0 |
| genvm-linter (AST, offline) | `python3 -m genvm_linter.cli lint contracts/ClauseAccord.py` | passed (3 checks), rc 0 |
| contract tests, Direct Mode | `python3 -m pytest tests/contract -q` | 68 passed |
| mutation check | `python3 tools/mutate.py .` | 32/32 deliberate faults caught (`tests/mutations.py`) |
| frontend logic tests | `npm test` | 53 passed |
| build | `npm run build` (`tsc -b && vite build`) | rc 0 |
| source hash | `npm run verify:source` | PASS |
| calldata table | `node tools/calldata-bytes.mjs` | every hard-block row ≤ 255 bytes (table below) |

`lint` is used, not `check`: `check` calls the network and exits 1 in CI.

### Calldata size (offline, encoded exactly as genlayer-js 1.1.8 `writeContract`)

| Row | Bytes |
|---|---|
| propose_clause S1 / S2 / S3 / S4 / S5 | 155 / 147 / 165 / 193 / 149 |
| propose_clause E1 / E2 / E3 / E4 / E5 | 147 / 136 / 163 / 154 / 137 |
| propose_clause at the 140-character contract cap | 242 |
| open_agreement (wallet + 60-char title) | 140 |
| ratify_clause (id + text hash) | 165 |
| invoke_clause (id + 60-char note) | 161 |
| acknowledge / contest_invocation (id + index 20 + 60-char note) | 173 / 169 |
| decline / withdraw / request / cancel / confirm (id) | 100 / 101 / 99 / 98 / 99 |

Every write fits at its contract cap in ASCII. Non-ASCII text can pass 255 bytes below 140 characters; the
app's byte meter blocks it before the wallet opens.

### Calldata on the real RPC

`node tools/probe-calldata.mjs <address>` sends each row as a `gen_call` write simulation (no wallet, no
transaction, no model call: each row is built to stop at a deterministic revert after the node has decoded
it). CI runs it for the address in `deployments.json` (job `probe`) and fails on anything else.

### UI check against a mocked contract

The built app was driven in Chromium against an in-memory copy of the contract rules: the other side
ratifies only after ticking the read box; the proposer sees Withdraw, not Ratify; a duplicate text is
blocked with the contract's sentence; the close dialog lists lapsing and voiding clauses; the requester
cannot confirm its own close; after the confirmed close the LAPSED row is disabled with the contract's
sentence and the STANDING row stays invocable; no horizontal scroll at 390 px.

Retry path: a write was held back by the mock. *Check again* before it applied stayed "confirmation
delayed" (no success); *Check again* after it applied reported success from the same postcondition.

## Run by hand on StudioNet

Only what needs a real wallet, a real signature or a human eye. Results and hashes: `RUNTIME_EVIDENCE.md`.

2.0 run on 2026-10-07: 15 transactions through the app on the contract above, two agreements between the same two
wallets, all FINALIZED with SUCCESS, and 4 screenshots. Every label came out as expected (S4 STANDING twice, E1 and E2
LAPSED).

A call the app already knows will revert is **not** sent — the button is disabled with the contract's
sentence — so its proof is a screenshot, not a hash.

## Consensus behaviour

A leader/validator disagreement on the label fails the `propose_clause` transaction: no clause is
recorded with a label the validators did not agree on. The user can try again.

## What this run does NOT prove

- The Direct Mode tests use **mocked** model answers. They prove the deterministic code paths, not what
  the real model returns. Only `RUNTIME_EVIDENCE.md` proves labels.
- **Label stability is not guaranteed on borderline sentences.** In 1.0, E3 was labelled differently on
  two deployments; both results are recorded.
- Prompt-injection resistance is argued from the fence and the reserved-token check; no adversarial
  model run was performed.
- Nothing verifies the facts behind an invocation or its answer.
