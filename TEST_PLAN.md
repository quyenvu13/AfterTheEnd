# TEST_PLAN — ClauseAccord / AfterTheEnd 2.0

## 1. Semantic cases (StudioNet only — the real model)

Same ten cases as SurvivalGate; the prompt now carries the clause text only.

| Case | Text | Expected |
|---|---|---|
| S1 | Confidentiality continues after the arrangement ends. | SURVIVES |
| S2 | The indemnity is not affected by termination. | SURVIVES |
| S3 | We remain answerable for anything done while the work was live. | SURVIVES |
| S4 | Nothing in the closing of this arrangement releases either party from what is already owed. | SURVIVES |
| S5 | The audit rights outlast the engagement itself. | SURVIVES |
| E1 | The licence lapses when the arrangement ends. | DIES_WITH_IT |
| E2 | Support stops on the closing date. | DIES_WITH_IT |
| E3 | Once we close, neither party owes the other anything further. | DIES_WITH_IT |
| E4 | The exclusivity applies only while the work is live. | DIES_WITH_IT |
| E5 | Access is withdrawn at termination. | DIES_WITH_IT |

Gate (CI): `python3 CLAUSEACCORD_KILLSET_CHECK.py contracts/ClauseAccord.py` → `NO LEAK` and `PASS`.
If a case gets the wrong label the rubric is **not** edited; the real result is recorded.

## 2. Two-party flow on StudioNet (through the app)

Open agreement (A) → propose S4 and E1 (A) → ratify both (B) → propose E2 and leave it unratified (B) →
invoke E1 (A) → acknowledge it (B) → request close (A) → confirm close (B) → invoke S4 after the close (B).
Expected: S4 STANDING, E1 LAPSED, E2 VOID after the close, E1 no longer invocable. Results: `RUNTIME_EVIDENCE.md`.

## 3. Deterministic cases (automated — `tests/contract/test_clauseaccord.py`)

| Requirement | Test |
|---|---|
| STANDING outlives the confirmed close, LAPSED does not | `test_tooth_standing_outlives_the_close_and_lapsed_does_not` |
| a proposal binds nothing until ratified | `test_a_proposed_clause_binds_nothing_until_ratified` |
| only the other side ratifies; the exact normalized text | `test_either_side_may_propose_and_only_the_other_ratifies`, `test_ratification_signs_the_exact_normalized_text` |
| decline / withdraw; freed places | `test_declined_clause_never_binds_and_frees_its_slot`, `test_the_proposer_may_withdraw_before_ratification_only`, `test_declined_and_withdrawn_proposals_free_the_active_cap` |
| one side alone cannot close; cancel; nothing new while closing | `test_one_side_alone_cannot_close`, `test_the_requester_may_cancel_and_the_agreement_is_live_again`, `test_nothing_new_is_proposed_or_ratified_while_closing` |
| pending proposals become void at the close | `test_confirmed_close_voids_pending_proposals` |
| another agreement for the same two wallets | `test_the_same_two_sides_may_open_another_agreement` |
| invocations answered by the other side, once, also after the close | `test_the_other_side_acknowledges_or_contests_once`, `test_invocations_stay_answerable_after_the_close` |
| strangers refused everywhere | `test_a_stranger_is_refused_by_every_restricted_write` |
| fail-safe, validator, prompt inputs, fence | `test_fail_safe_on_unparseable_output`, `test_fail_safe_on_a_non_object_reply`, `test_validator_rejects_disagreement_and_bad_shapes`, `test_prompt_sees_the_clause_text_only`, `test_the_text_is_fenced_and_reserved_tokens_refused` |
| ids equal the frontend's | `test_vectors_match_contract` |
| one test per revert string (29) | `test_every_revert_string_has_exactly_one_dedicated_test` |

Mutation check: `python3 tools/mutate.py .` applies each fault in `tests/mutations.py` (32) and requires a red run.

## 4. Frontend logic (automated — `tests/js/`)

| File | Covers |
|---|---|
| `rules.test.ts` | the app's revert sentences are exactly the contract's 29; every disabled-button reason follows the contract's check order |
| `verify.test.ts` | postconditions for every write, including "one side alone closing is wrong" and "a pending proposal must be void" |
| `retry.test.ts` | *Check again* uses the same settle rule and the same postcondition as the first attempt; never success from the receipt alone |
| `ids.test.ts` / `parse.test.ts` / `pytext.test.ts` | ids equal the contract's vectors; view parsing; Python whitespace parity |
| `receipt.test.ts` | leader receipt rule; pending is not success; revert sentence extraction |
| `calldata.test.ts` | every write at its contract cap fits in 255 bytes |
| `static.test.ts` / `source.test.ts` / `docs.test.ts` | repository rules, source hash, docs in sync |
