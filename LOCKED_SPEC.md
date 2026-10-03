# LOCKED_SPEC — SurvivalGate

Source: `contracts/SurvivalGate.py`, py-genlayer v0.2 (`# v0.2.16` header), GenLayer StudioNet chain 61999.
SHA-256 of the frozen file: see `SOURCE_SHA256.txt`. Changing one byte invalidates every runtime result.

## 1. The semantic question

> When the two sides close the agreement, does this clause stay alive or die with it?

"Confidentiality continues after the arrangement ends" and "The licence lapses when the arrangement ends"
talk about the same event, in the same kind of sentence, with opposite fates.

## 2. Novelty: one future event, a different effect on each record

Before `close_agreement` the two kinds of clause are indistinguishable by behaviour. The verdict is
written earlier and stays dormant; **one** later deterministic transaction splits the register.

| | before `close_agreement` | after `close_agreement` |
|---|---|---|
| clause `STANDING` (`SURVIVES`) | `invoke_clause` works | `invoke_clause` still works |
| clause `LAPSED` (`DIES_WITH_IT`) | `invoke_clause` works | `invoke_clause` reverts, permanently |
| `record_clause` | works | reverts |
| `contest_invocation` | works | still works for every recorded invocation |

What changes is a record's **fate at a single future event**, set by a semantic label frozen before
that event. The method set is identical for every record until the close.

## 3. Relations and identifiers

- One agreement per (author, other wallet) pair:
  `agreement_id = keccak256("SURVIVAL_GATE:AGREEMENT:V1|" + author_lower + "|" + other_wallet_lower)`.
  `record_clause` creates it on first use; there is no separate open method.
- Clauses belong to an agreement:
  `clause_id = keccak256("SURVIVAL_GATE:CLAUSE:V1|" + agreement_id + "|" + len(norm) + "|" + norm)`,
  where `norm = " ".join(text.strip().split())` (Python whitespace, code-point length). The stored text
  is the stripped original; only the id uses the normalized form. The same sentence in two agreements
  is two clauses; the same sentence twice in one agreement is rejected (no re-roll).
- `clause_at[agreement_id:position]` (1-based) lists clauses in order without scanning.

## 4. Enums, state and the deciding line

```
SURVIVES | DIES_WITH_IT            model outcome, stored as `outcome`
STANDING | LAPSED                  fate, set once from the outcome, never changed
LIVE -> CLOSED                     agreement state, one way, no reopen method
```

A clause has no state of its own. Whether it can be invoked is computed, never stored:

```python
def _is_invocable(self, agreement_state, fate):
    return agreement_state != STATE_CLOSED or fate == FATE_STANDING
```

Four combinations, three `True`. `get_clause` returns `invocable` computed by this same function.

## 5. Write methods (check order is part of the spec)

`record_clause(other_wallet, other_label, text)` — the only model call.
wallet → label (`Label is empty` / `Label is too long`) → text (`Text is empty` / `Text is too long`) →
reserved tokens in text or label → other ≠ author → if the agreement exists it must be `LIVE`
(`This agreement is closed; no further clauses can be recorded`) → fewer than 20 clauses
(`This agreement is full`) → not a duplicate (`This clause already exists in this agreement`) → model.
The model always reads the label stored on the agreement (set by its first clause); a different label
passed on a later call is validated but not used, so the label cannot be varied per clause.
`SURVIVES` → `STANDING`, `standing_count += 1`; `DIES_WITH_IT` → `LAPSED`, `lapsed_count += 1`.

`invoke_clause(clause_id_hex, note)` — either named side.
id (`Unknown clause id`) → side (`Only the two named sides may invoke a clause`) →
`_is_invocable` (`This clause lapsed when the agreement was closed`) → room
(`No room for further invocations`) → note (`Note is empty` / `Note is too long`). Writes
`invocation_note` and `invocation_by` at index `invocation_count + 1`.

`close_agreement(other_wallet_or_author)` — either side passes the other side's wallet.
wallet → id computed as (caller, counterpart) and as (counterpart, caller); neither exists →
`Unknown agreement` (an id built from the caller proves the caller is a side) → `LIVE`
(`This agreement is already closed`) → `CLOSED`, `closed_by = caller`, `closed_at =
gl.message_raw["datetime"]` (recorded only, never compared). No model call.

`contest_invocation(clause_id_hex, index, note)` — works after the close.
id → side (`Only the two named sides may contest an invocation`) → `1 <= index <= invocation_count`
(`No such invocation`) → caller is not the invoker (`Only the other side may contest this invocation`)
→ not yet contested (`This invocation has already been contested`) → note. Once per invocation.

State checks come before the note in the two note-taking methods, so a clause that can never be invoked
again reports the lapse whatever the note says; the frontend mirrors this exact order.
A note must be non-empty: the one-time contest lock relies on an empty slot meaning "not contested".
`MAX_NOTE_LENGTH = 60` is a calldata ceiling (64-hex id + 60 characters), not a semantic limit.

## 6. Views

`get_agreement`, `get_clause`, `get_clause_at`, `get_clauses`, `get_invocation`, `get_contest`,
`get_rubric`, `get_limits`. All return JSON strings. An unknown or malformed id returns `"{}"`
(`"[]"` for `get_clauses`, which returns a list) and never reverts — the frontend probes accepted state this way before
sending. No view takes long text. There is no `preview_*`, `classify_*` or `dry_run_*` view: a free
off-chain trial would turn the mechanism into a wording game.

## 7. Fail-safe direction: `SURVIVES`

Unparseable, missing or unknown model output → `SURVIVES`.

- A wrong `DIES_WITH_IT` makes an obligation that should survive vanish at the close. The other side
  loses the right to invoke it, permanently — there is no method that restores a lapsed clause. If the
  clause is confidentiality or an indemnity, the whole post-agreement protection is gone. There is a
  victim.
- A wrong `SURVIVES` keeps an obligation invocable after the close. The author — who wrote the unclear
  sentence — stays bound longer. The other side loses nothing.

The asymmetry is real: `DIES_WITH_IT` cannot be undone afterwards; a wrong `SURVIVES` can still be
settled off-chain.

## 8. Why the author cannot polish wording toward a fate

The author does not know which fate helps at the time of writing. A clause binding the author
(the author keeps something confidential) is worse for the author if it `SURVIVES`; a clause binding the
other side (the other side pays what is already owed) is better for the author if it `SURVIVES`. There is
no single direction to polish toward. And because `record_clause` reverts after the close, nobody can
wait for the event and then add the clause that would have paid off — **the recording window closes
before the consequence appears.**

## 9. Prompt fence and nondeterminism

- The prompt contains only the rubric, the other side's label and the clause text, each in its own
  tagged block. No wallet, author, state or consequence reaches it.
- Text and label containing any reserved token (the four tags, `SURVIVES`, `DIES_WITH_IT`, compared
  upper-case) revert at the door: `Text or label contains a reserved token`. A fixed-point filter
  removes tokens again before the prompt is built.
- `gl.vm.run_nondet_unsafe(evaluate_once, validator_fn)`. The validator requires a `gl.vm.Return`
  dict whose outcome is one of the two labels, re-runs the evaluation and compares the label.
  Re-running does not defend against injection; the fence does. A leader/validator disagreement
  fails the transaction (fail-closed by design).
- Only `record_clause` calls the model: one model question per clause. `close_agreement` — the event
  that decides everything — never calls the model.

## 10. Never

No method changes a fate; no reopen method; no money, `emit_transfer`, `gl.evm` or web access; no clock
used for a decision; no admin.
