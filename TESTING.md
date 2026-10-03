# TESTING

```
COMPILE PASS ≠ RUNTIME PASS
SUBMITTED ≠ ACCEPTED ≠ FINALIZED ≠ EXECUTION SUCCESS ≠ POSTCONDITION PASS
```

## Run automatically (offline, also in CI)

| Gate | Command | Result |
|---|---|---|
| kill-set + rubric overlap | `python3 SURVIVALGATE_KILLSET_CHECK.py contracts/SurvivalGate.py` | NO LEAK + PASS, rc 0 |
| genvm-linter (AST, offline) | `python3 -m genvm_linter.cli lint contracts/SurvivalGate.py` | passed (3 checks), rc 0 |
| genvm-linter schema / typecheck | `python3.13 -m genvm_linter.cli schema|typecheck …` | 12 methods; no type errors (run once, not in CI) |
| contract tests, Direct Mode | `python3 -m pytest tests/contract -q` | 53 passed |
| frontend logic tests | `npm test` | 44 passed |
| build | `npm run build` (`tsc -b && vite build`) | rc 0 |
| source hash | `npm run verify:source` | PASS |
| calldata table | `node tools/calldata-bytes.mjs` | every hard-block row ≤ 255 bytes (table below) |

`lint` is used, not `check`: `check` calls the network and exits 1 in CI.

### Calldata size (offline, encoded exactly as genlayer-js 1.1.8 `writeContract`)

| Row | Bytes |
|---|---|
| record_clause S1 / S2 / S3 / S4 / S5 | 147 / 139 / 157 / 185 / 141 |
| record_clause E1 / E2 / E3 / E4 / E5 | 139 / 128 / 155 / 146 / 129 |
| invoke_clause (64-hex id + 60-char note) | 161 |
| contest_invocation (id + index 20 + 60-char note) | 169 |
| close_agreement (wallet) | 79 |
| record_clause at max label 80 + max text 600 (measure only) | 763 — over the cliff |

Longest ASCII clause text that fits with label `the other side`: **161 characters**. The UI shows a live
meter and blocks sending above 255 bytes.

### Calldata on the real RPC

`node tools/probe-calldata.mjs <address>` sends each row as a `gen_call` write simulation (no wallet,
no transaction, no model call: every row stops at a deterministic revert after the node has decoded the
calldata). CI runs it automatically for both addresses in `deployments.json` (job `probe`); the result is
the CI log.

## Run by hand on StudioNet

Only what needs a real wallet, a real signature or a human eye. Results and hashes: `RUNTIME_EVIDENCE.md`.

- The contract logic and the three must-verify checks were run on the Intelligent Contract deployment
  (11 transactions, all as expected; see the SurvivalGate repository).
- This Project: the same frozen source deployed again at its own address, then 6 transactions through the
  app and 3 screenshots (`RUNTIME_EVIDENCE.md`).

Note on the frontend: a call the app already knows will revert is **not** sent — the button is disabled
with the contract's sentence — so its proof is the screenshot, not a hash.

## Consensus behaviour

A leader/validator disagreement on the label fails the `record_clause` transaction. That is fail-closed
by design: no clause is recorded with a label the validators did not agree on. The user can try again.

## What this run does NOT prove

- The Direct Mode tests use **mocked** model answers. They prove the deterministic code paths, not what
  the real model returns. Only RUNTIME_EVIDENCE proves labels.
- **Label stability is not guaranteed on borderline sentences.** E3 was labelled `DIES_WITH_IT` on the
  Intelligent Contract deployment (after one leader rotation) and `SURVIVES` on the Project deployment.
  Both are recorded as they came out (`RUNTIME_EVIDENCE.md`).
- Clause texts longer than about 160 characters (the contract allows 600) have not been sent on
  StudioNet; the calldata path above 255 bytes is not proven.
- Prompt-injection resistance is argued from the fence and the door check; no adversarial model run
  was performed.
- The UI flow was rendered against a local mock of the RPC to check the three screens; the real
  wallet flow is covered only by the Project transactions.
- `closed_at` comes from `gl.message_raw["datetime"]`; its exact format on StudioNet is whatever the
  node supplies, and nothing depends on it.
