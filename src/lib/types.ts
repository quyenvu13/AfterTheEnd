export type Agreement = {
  agreement_id: string;
  author: string;
  other_wallet: string;
  other_label: string;
  state: "LIVE" | "CLOSED" | string;
  closed_by: string;
  closed_at: string;
  clause_count: number;
  standing_count: number;
  lapsed_count: number;
};

export type Clause = {
  clause_id: string;
  agreement_id: string;
  text: string;
  outcome: string;
  fate: "STANDING" | "LAPSED" | string;
  invocation_count: number;
  invocable: boolean;
  agreement_state: string;
  author: string;
  other_wallet: string;
};

export type Invocation = {
  clause_id: string;
  index: number;
  note: string;
  by: string;
  contested: boolean;
  contest_note?: string;
};

export type TxPhase = "idle" | "checking" | "signing" | "submitted" | "delayed" | "success" | "error";

export type TxStatus = {
  phase: TxPhase;
  message: string;
  hash?: string;
};
