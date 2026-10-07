# Security

## Two-party rules
- No clause binds on its proposer's word: the other side must call `ratify_clause` with the hash of the
  exact normalized text (`The ratified text does not match this clause` otherwise). The app computes the
  hash from the text it displays and refuses to send if it differs from the stored hash.
- No close happens on one side's word: `confirm_close` must come from the side that did not request it
  (`The other side must confirm the close`).
- An invocation is answered only by the other side (`Only the other side may answer this invocation`),
  once (`This invocation has already been answered`).
- Every write checks that the caller is one of the two sides before anything else
  (`Only the two sides of this agreement may do this`); `withdraw_clause` checks the proposer.

## Prompt fence
- The prompt carries only the rubric and the clause text inside `<UNTRUSTED_CLAUSE_TEXT>`. Wallets,
  title, agreement state and what the contract does with the answer never reach the prompt
  (`test_prompt_sees_the_clause_text_only`).
- Text containing a reserved token — the two tags, `SURVIVES`, `DIES_WITH_IT`, compared upper-case — is
  rejected before any model call: `Text contains a reserved token`. Titles are checked the same way.
- A fixed-point filter strips tokens again before the prompt is built, so nested fragments cannot
  rebuild a tag (`test_the_text_is_fenced_and_reserved_tokens_refused`).
- Validator re-runs compare labels; they do not defend against injection. The fence does. A text that
  tries to steer the label still has to be ratified by the other side, who sees the resulting fate.

## Fail-safe
Unparseable, missing or unknown output becomes `SURVIVES`. A wrong `DIES_WITH_IT` would erase protection
at the close; a wrong `SURVIVES` keeps a clause alive longer. The other side sees the fate before ratifying.

## Remaining limits
- A confirmed close cannot be undone (two signatures, full preview of what lapses or becomes void).
- Invocations and answers are statements; nothing verifies their content.
- No funds are held; no web access; no clock; no admin.

Report issues through the repository's issue tracker.
