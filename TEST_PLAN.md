# TEST_PLAN — SurvivalGate / AfterTheEnd

## 1. Semantic cases (run on StudioNet only — the real model)

Declared on chain for every case: `other_label = "the other side"`. The author drafts the agreement.

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

Adversarial pairs — same surface, opposite label:

| Pair | Shared surface | Why the labels differ | Class |
|---|---|---|---|
| **S4 / E3** | sweeping statements about what is owed at the close; both full of `close`/`owed`/`party` | S4: closing does **not** release; E3: after closing nothing **remains** owed | kill test |
| **S3 / E4** | the same five words `while the work was/is live`, only the verb differs | S3: responsibility for that period **remains**; E4: the right applies **only within** it | kill test |
| S2 / E5 | what termination does to a right | S2: not affected; E5: withdrawn | kill test |
| S5 / E2 | a named right or service and its fate | S5: outlasts; E2: stops on the day | kill test |
| S1 / E1 | the formula "X … when the arrangement ends" | S1 continues; E1 lapses | definition-compliance check |

S1/E1 are **not** kill tests: `continues after … ends` and `lapses when … ends` read straight off the
rubric's definitions. The other four pairs are kill tests: the rubric gives no hint of the mechanism.

Gate (CI): `python3 SURVIVALGATE_KILLSET_CHECK.py contracts/SurvivalGate.py` → `NO LEAK` (no token or
bigram separates the classes) and `PASS` (the rubric shares no content word with any case). The gate does
not stem; the rubric was also read by hand for near-matches and for naming any category a test case
belongs to.

Must-verify on StudioNet — all three PASSED on 2026-10-03 on the Intelligent Contract deployment
(`0x294667415F31825ddC29f986B47c3dE747c1ff85`, 11 transactions, recorded in the SurvivalGate repository):
- MV-1: S4 and E3 get different labels.
- MV-2: S3 and E4 get different labels.
- MV-3: before the close `invoke_clause` succeeds on both a STANDING and a LAPSED clause; after the close
  it succeeds on STANDING and reverts on LAPSED.

If a case gets the wrong label the rubric is **not** edited to make it pass; the real result is recorded.

## 2. Deterministic cases (automated, offline — `tests/contract/test_survivalgate.py`)

Run in GenLayer Direct Mode on the real py-genlayer SDK; the model is mocked with assumed labels.

| Requirement | Test |
|---|---|
| `_is_invocable`, four combinations, three True | `test_is_invocable_four_combinations`, `test_is_invocable_exactly_three_true` |
| `get_clause().invocable` equals `_is_invocable` in all four cells | `test_get_clause_invocable_matches_is_invocable_in_all_four_cells` |
| four-cell invoke sequence around one close | `test_four_cell_invoke_sequence` |
| both sides may invoke | `test_both_sides_may_invoke` |
| other side == author reverts | `test_revert_other_side_is_author` |
| duplicate in same agreement reverts; same text elsewhere succeeds | `test_revert_duplicate_clause`, `test_same_text_in_other_agreement_succeeds` |
| record after close reverts; full agreement reverts | `test_revert_record_after_close`, `test_revert_agreement_full` |
| stranger invokes / contests; stranger closes | `test_revert_stranger_invokes`, `test_revert_stranger_contests`, `test_revert_unknown_agreement` |
| close twice reverts; each side can close | `test_revert_already_closed`, `test_author_can_close`, `test_other_side_can_close` |
| contest after close succeeds | `test_contest_works_after_close` |
| index 0 / beyond count; own invocation; already contested | `test_revert_no_such_invocation`, `test_revert_invoker_contests_self`, `test_revert_already_contested` |
| invocations full | `test_revert_invocations_full` |
| standing + lapsed == clause count after every write | `test_counts_always_add_up` |
| reserved token in text or label | `test_revert_reserved_token` |
| inner whitespace → same id; wallet case → same agreement | `test_inner_whitespace_variants_share_one_id`, `test_wallet_case_gives_same_agreement` |
| ids equal the documented formula | `test_local_id_formula_matches_contract`, `test_vectors_match_contract` |
| fail-safe on bad output | `test_fail_safe_on_unparseable_output`, `test_fail_safe_on_unknown_label` |
| validator rejects disagreement / bad shapes | `test_validator_rejects_disagreement_and_bad_shapes` |
| prompt never contains wallets | `test_prompt_never_sees_wallets` |
| model reads the agreement's stored label | `test_model_sees_the_agreement_label_not_a_per_call_label` |
| fixed-point fence | `test_fence_strip_is_fixed_point` |
| views never revert on unknown ids | `test_views_on_unknown_ids`, `test_views_out_of_range_and_paging` |
| state checks before note check | `test_check_order_state_before_note` |
| every revert string has exactly one dedicated test | `test_every_revert_string_has_exactly_one_dedicated_test` (22 strings) |
| no forbidden method or API in source | `test_no_forbidden_methods_in_source` |

## 3. Frontend logic (automated — `tests/js/`)

| File | Covers |
|---|---|
| `pytext.test.ts` | `pyStrip` / normalize / `pyLen` against real Python on 17 strings incl. U+001C–U+001F, U+0085, U+FEFF |
| `ids.test.ts` | local Keccak-256 ids equal vectors computed by the contract code (`tests/js/id-vectors.json`) |
| `rules.test.ts` | the UI's revert strings are exactly the contract's 22; every disabled-button reason follows the contract's check order |
| `receipt.test.ts` | leader receipt rule; null result is not success; revert sentence extracted from plain/hex/base64 and nested `cause` |
| `verify.test.ts` | postconditions reject a stale record that only has the expected id |
| `calldata.test.ts` | all 10 cases and the id+note methods fit in 255 bytes |
| `static.test.ts` | escaping, no raw HTML injection, no Snap connect, no CDN hash library, no hard-coded address, proxy in both configs, pins |
| `ids-html.test.ts` | the offline `tools/ids.html` calculator gives the contract's ids |
| `source.test.ts` | `verify:source` accepts CRLF and a missing final newline, rejects one changed byte |
