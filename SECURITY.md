# Security

## Prompt fence
- The prompt carries only the rubric, the other side's label and the clause text, each inside its own
  tag (`<UNTRUSTED_OTHER_SIDE_LABEL>`, `<UNTRUSTED_CLAUSE_TEXT>`). Wallets, the author, agreement state and
  what the contract does with the answer never reach the prompt (`test_prompt_never_sees_wallets`).
- Text or label containing a reserved token — the four tags, `SURVIVES`, `DIES_WITH_IT`, compared
  upper-case — is rejected before any model call: `Text or label contains a reserved token`.
- A fixed-point filter strips tokens again before the prompt is built, so nested fragments cannot
  rebuild a tag (`test_fence_strip_is_fixed_point`).
- Validator re-runs compare labels; they do not defend against injection. The fence does.

## Fail-safe
Unparseable, missing or unknown output becomes `SURVIVES`. A wrong `SURVIVES` keeps the author bound
longer; a wrong `DIES_WITH_IT` would erase the other side's protection at the close and cannot be undone.

## Remaining limits
- A wrongly `LAPSED` clause cannot be restored after the close. The UI lists every clause about to lapse
  and requires typing `CLOSE`; contests remain open after the close.
- Invocations are self-declared statements; nothing verifies their content.
- Either side can close alone.
- No funds are held; no web access; no admin; the clock is recorded, never used to decide.

Report issues through the repository's issue tracker.
