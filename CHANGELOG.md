# Changelog

## 2.0.0 — 2026-10-07

Review feedback on 1.0: unilateral trust model, irreversible lifecycle gaps, prompt limitations and a
retry-path verification flaw. 2.0 replaces the contract with `ClauseAccord` and fixes the app.

**Trust model — nothing counts on one side's word**
- A clause binds only after the **other** side ratifies it by the keccak256 hash of the exact text,
  together with its frozen fate (`ratify_clause`). It can decline instead (`decline_clause`).
  1.0: the author's clause bound at once.
- Either side may propose; the proposer cannot ratify or decline its own clause.
- Invocations are answered by the other side, once: `acknowledge_invocation` or `contest_invocation`.
- Closing takes two signatures: `request_close` by one side, `confirm_close` by the other.
  1.0: either side closed alone, in one transaction.

**Lifecycle**
- `cancel_close` lets the requester take a close request back before it is confirmed.
- The proposer can `withdraw_clause` while it waits; declined and withdrawn proposals free their place
  (cap of 20 counts only waiting and ratified clauses; 40 proposals ever).
- Proposals still waiting at the confirmed close become `VOID`: a fate nobody signed never applies.
- Nothing can be proposed or ratified once a close is requested.
- Agreements are opened explicitly with a title; the same two wallets can open more than one.
  1.0: exactly one agreement per wallet pair, created by the first clause.

**Prompt**
- The model sees the rubric and the clause text only — the counterparty label is gone; nothing a
  side writes besides the clause text reaches the prompt.
- Clause text capped at 140 characters, which fits the 255-byte calldata limit (1.0 allowed 600, of
  which only about 160 could be sent).
- Rubric unchanged, verbatim from SurvivalGate; fail-safe still `SURVIVES`.

**Retry path (frontend)**
- 1.0 bug: *Check again* on a delayed transaction reported success without checking the result.
- 2.0: *Check again* re-reads the receipt of the **same** transaction and re-runs **that write's own**
  postcondition on reloaded state (`src/lib/retry.ts`, shared with the first attempt). Covered by
  `tests/js/retry.test.ts` and by a UI check where the change is applied only after the first retry.

**Tests:** 68 Direct Mode contract tests, 32/32 deliberate faults caught (`tests/mutations.py`),
frontend logic suite, kill-set gate, calldata table, source hash, RPC probe in CI.

## 1.0.0 — 2026-10-03

- `SurvivalGate` contract: clauses labelled once (`SURVIVES` / `DIES_WITH_IT`) and frozen as a fate;
  one deterministic `close_agreement` splits invocability; `contest_invocation` keeps working after close.
- AfterTheEnd frontend: one register per agreement, CLOSED palette, close dialog listing the clauses
  that will lapse, disabled buttons with the contract's exact revert sentences, live calldata meter.
