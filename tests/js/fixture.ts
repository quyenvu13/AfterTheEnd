// get_agreement / get_clause views as the contract returns them.
import type { Agreement, Clause, Invocation } from "../../src/lib/types.ts";
import { agreementIdOf, clauseIdOf, textHashOf } from "../../src/lib/ids.ts";

export const A = "0x923a09d0d6e5c242e36c3c1d2071835917cc0bdf";
export const B = "0x10aaa763db250e4856210dfb91b57780f60e9879";
export const S = "0x146e44881d35814ba582d265af5b97ef2695ec8e";
export const TITLE = "Website build";
export const AID = agreementIdOf(A, B, TITLE);
export const S4 = "Nothing in the closing of this arrangement releases either party from what is already owed.";
export const E1 = "The licence lapses when the arrangement ends.";

export function agreement(over: Partial<Agreement> = {}): Agreement {
  return {
    agreement_id: AID, party_a: A, party_b: B, title: TITLE, state: "LIVE", close_requested_by: "", closed_by: "",
    slot_count: 1, active_count: 1, standing_count: 0, lapsed_count: 0, ...over,
  };
}

export function clause(over: Partial<Clause> = {}, text = S4): Clause {
  return {
    clause_id: clauseIdOf(AID, text), agreement_id: AID, proposer: A, text, text_hash: textHashOf(text), outcome: "SURVIVES",
    fate: "STANDING", state: "PROPOSED", invocable: false, agreement_state: "LIVE", invocations: [], ...over,
  };
}

export function inv(over: Partial<Invocation> = {}): Invocation {
  return { index: 1, note: "invoice 12 unpaid", by: A, state: "PENDING", response_note: "", ...over };
}
