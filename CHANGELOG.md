# Changelog

## 1.0.0 — 2026-10-03

- `SurvivalGate` contract: clauses labelled once (`SURVIVES` / `DIES_WITH_IT`) and frozen as a fate;
  one deterministic `close_agreement` splits invocability; `contest_invocation` keeps working after close.
- Spec decisions recorded in LOCKED_SPEC: notes must be non-empty (`Note is empty`), and in the two
  note-taking methods state checks come before the note check; the model reads the agreement's stored label; the model's label is stored as `outcome`
  next to the fate; views return JSON strings and `"{}"` for unknown ids.
- AfterTheEnd frontend: one register per agreement, CLOSED palette, close dialog listing the clauses
  that will lapse, disabled buttons with the contract's exact revert sentences, receipt-first
  verification with strict postconditions, live calldata meter.
- Tests: Direct Mode contract suite, frontend logic suite, kill-set gate, calldata table, source hash.
- Source frozen; SHA-256 in `SOURCE_SHA256.txt`.
