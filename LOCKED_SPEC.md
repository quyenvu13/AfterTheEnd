# LOCKED_SPEC — ClauseAccord (AfterTheEnd 2.0)

Source: `contracts/ClauseAccord.py`, py-genlayer v0.2 (`# v0.2.16` header), GenLayer StudioNet chain 61999.
SHA-256 of the frozen file: see `SOURCE_SHA256.txt`. Changing one byte invalidates every runtime result.

## 1. The semantic question (unchanged from SurvivalGate)

> When the two sides close the agreement, does this clause stay alive or die with it?

"Confidentiality continues after the arrangement ends" and "The licence lapses when the arrangement ends"
talk about the same event, in the same kind of sentence, with opposite fates. The rubric is the SurvivalGate
rubric verbatim (`test_rubric_is_the_survivalgate_rubric_verbatim`).

## 2. Two-party rule

No operative fact counts on one side's word alone:

| Fact | Who starts it | Who must sign it |
|---|---|---|
| a clause binds | either side proposes (`propose_clause`) | the **other** side ratifies the text hash + fate (`ratify_clause`) |
| an invocation is settled | either side invokes (`invoke_clause`) | the **other** side acknowledges or contests (`acknowledge_invocation` / `contest_invocation`) |
| the agreement closes | either side requests (`request_close`) | the **other** side confirms (`confirm_close`) |

## 3. One future event, a different effect on each record

| | LIVE / CLOSING | after `confirm_close` |
|---|---|---|
| RATIFIED · `STANDING` (`SURVIVES`) | invocable | still invocable |
| RATIFIED · `LAPSED` (`DIES_WITH_IT`) | invocable | `invoke_clause` reverts, permanently |
| PROPOSED | binds nothing | becomes `VOID`, binds nothing |
| DECLINED / WITHDRAWN | binds nothing | binds nothing |

```python
def _is_invocable(self, agreement_state, clause):
    if clause.state != C_RATIFIED:
        return False
    return agreement_state != STATE_CLOSED or clause.fate == FATE_STANDING
```

`get_clause().invocable` is computed by this same function.

## 4. Identifiers

- `agreement_id = keccak256("CLAUSE_ACCORD:AGREEMENT:V1|" + a + "|" + b + "|" + len(t) + "|" + t)` — `a` the
  opener, `b` the named wallet (both lower-case), `t` the normalized title.
- `clause_id = keccak256("CLAUSE_ACCORD:CLAUSE:V1|" + agreement_id + "|" + len(t) + "|" + t)` — `t` the
  normalized clause text. A text proposed once in an agreement cannot be proposed again there (no re-roll).
- `text_hash = keccak256(t)` — what `ratify_clause` must present.
- `t = " ".join(value.strip().split())`, Python whitespace, code-point length. Stored text is the stripped
  original. Vectors shared with the app: `tests/js/id-vectors.json`.

## 5. States

```
agreement  LIVE -> CLOSING -> CLOSED           (CLOSING -> LIVE by cancel_close)
clause     PROPOSED -> RATIFIED | DECLINED | WITHDRAWN | VOID
invocation PENDING -> ACKNOWLEDGED | CONTESTED
```

## 6. Write methods (check order is part of the spec)

- `open_agreement(other_wallet, title)`: wallet → title empty / too long (60) → reserved token → not yourself → not existing.
- `propose_clause(agreement_id, text)` — the only model call: agreement → side → LIVE → text empty / too long (140) →
  reserved token → room (20 active, 40 ever) → not proposed before → model. `SURVIVES` → `STANDING`, `DIES_WITH_IT` → `LAPSED`.
- `ratify_clause(clause_id, text_hash)`: clause → side → not the proposer → PROPOSED → agreement LIVE → hash matches.
- `decline_clause(clause_id)`: clause → side → not the proposer → PROPOSED.
- `withdraw_clause(clause_id)`: clause → the proposer → PROPOSED.
- `invoke_clause(clause_id, note)`: clause → side → RATIFIED → invocable → room (20) → note (1–60).
- `acknowledge_invocation` / `contest_invocation(clause_id, index, note)`: clause → side → index exists → not the invoker → PENDING → note.
- `request_close(agreement_id)`: agreement → side → LIVE.
- `cancel_close(agreement_id)`: agreement → side → CLOSING → the requester.
- `confirm_close(agreement_id)`: agreement → side → CLOSING → not the requester → PROPOSED clauses become VOID → CLOSED.

Every revert sentence has one dedicated test (`test_every_revert_string_has_exactly_one_dedicated_test`, 29 strings).

## 7. Prompt

Rubric + clause text inside `<UNTRUSTED_CLAUSE_TEXT>`; nothing else. Reserved tokens are refused and
stripped to a fixed point. `run_nondet_unsafe` with a validator that re-runs the classification and compares
labels. Unparseable or unknown output → `SURVIVES`.

## 8. Out of scope

No money, no clock, no web, no admin, no upgrade path. Views return JSON strings; unknown ids return `"{}"`.
