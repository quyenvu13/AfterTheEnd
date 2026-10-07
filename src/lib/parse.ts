// Contract views return JSON strings; an unknown id returns "{}".
import type { Agreement, Clause } from "./types.ts";

function parseAny(raw: string): unknown {
  try {
    let value: unknown = JSON.parse(raw);
    if (typeof value === "string") value = JSON.parse(value);
    return value;
  } catch {
    return null;
  }
}

function asObject(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length > 0 ? (v as Record<string, unknown>) : null;
}

const str = (v: unknown) => typeof v === "string";
const num = (v: unknown) => typeof v === "number";

function isInvocation(o: Record<string, unknown> | null): boolean {
  return !!o && num(o.index) && str(o.note) && str(o.by) && str(o.state) && str(o.response_note);
}

function isClause(o: Record<string, unknown> | null): boolean {
  return !!o && str(o.clause_id) && str(o.agreement_id) && str(o.proposer) && str(o.text) && str(o.text_hash) &&
    str(o.outcome) && str(o.fate) && str(o.state) && typeof o.invocable === "boolean" && Array.isArray(o.invocations) &&
    (o.invocations as unknown[]).every((i) => isInvocation(asObject(i)));
}

export function parseAgreement(raw: string): Agreement | null {
  const o = asObject(parseAny(raw));
  if (!o || !str(o.agreement_id) || !str(o.party_a) || !str(o.party_b) || !str(o.title) || !str(o.state) ||
      !str(o.close_requested_by) || !str(o.closed_by) || !num(o.slot_count) || !num(o.active_count) ||
      !num(o.standing_count) || !num(o.lapsed_count)) return null;
  return o as unknown as Agreement;
}

export function parseClause(raw: string): Clause | null {
  const o = asObject(parseAny(raw));
  return isClause(o) ? (o as unknown as Clause) : null;
}

export function parseClauses(raw: string): Clause[] | null {
  const o = asObject(parseAny(raw));
  if (!o || !Array.isArray(o.clauses)) return null;
  const rows = o.clauses as unknown[];
  if (!rows.every((r) => isClause(asObject(r)))) return null;
  return rows as Clause[];
}

export type Limits = { rubric_hash?: string; contract_name?: string; version?: string; prompt_inputs?: string[]; two_party?: Record<string, boolean> };

export function parseLimits(raw: string): Limits | null {
  return asObject(parseAny(raw)) as Limits | null;
}
