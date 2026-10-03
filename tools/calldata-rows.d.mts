export const OTHER: string;
export const AUTHOR: string;
export const LABEL: string;
export const ID: string;
export const NOTE60: string;
export const CASES: Record<string, string>;
export type Row = { name: string; method: string; args: unknown[] };
export function hardBlockRows(): Row[];
export function measureOnlyRows(): Row[];
