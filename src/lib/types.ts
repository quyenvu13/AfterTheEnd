// Shapes of the contract's JSON views.

export type Agreement = {
  agreement_id: string;
  party_a: string;
  party_b: string;
  title: string;
  state: "LIVE" | "CLOSING" | "CLOSED" | string;
  close_requested_by: string;
  closed_by: string;
  slot_count: number;
  active_count: number;
  standing_count: number;
  lapsed_count: number;
};

export type Invocation = {
  index: number;
  note: string;
  by: string;
  state: "PENDING" | "ACKNOWLEDGED" | "CONTESTED" | string;
  response_note: string;
};

export type Clause = {
  clause_id: string;
  agreement_id: string;
  proposer: string;
  text: string;
  text_hash: string;
  outcome: "SURVIVES" | "DIES_WITH_IT" | string;
  fate: "STANDING" | "LAPSED" | string;
  state: "PROPOSED" | "RATIFIED" | "DECLINED" | "WITHDRAWN" | "VOID" | string;
  invocable: boolean;
  agreement_state: string;
  invocations: Invocation[];
};

export type TxPhase = "idle" | "checking" | "signing" | "submitted" | "delayed" | "success" | "error";

export type TxStatus = { phase: TxPhase; message: string; hash?: string; action?: string };
