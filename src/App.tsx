import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { calldataBytes, CALLDATA_LIMIT } from "./lib/calldata";
import { CONTRACT_ADDRESS, EXPLORER_BASE, SOURCE_SHA256 } from "./lib/config";
import { errorMessage } from "./lib/errors";
import { escapeHtml } from "./lib/escape";
import {
  connectedWallet, getAgreement, getClause, getClauses, getLimits, readVerdict, requestWallet, sendWrite, waitForVerdict,
} from "./lib/genlayer";
import { agreementIdOf, clauseIdOf, idsFromInput, short, textHashOf } from "./lib/ids";
import type { Limits } from "./lib/parse";
import { pyLen, pyStrip } from "./lib/pytext";
import { settle, type Verify } from "./lib/retry";
import {
  cancelCloseBlock, closeEffect, confirmCloseBlock, declineBlock, invokeBlock, isSide, MAX_NOTE_LENGTH, MAX_TEXT_LENGTH,
  MAX_TITLE_LENGTH, openBlock, otherSide, proposeBlock, ratifyBlock, requestCloseBlock, respondBlock, REVERTS, same, UI,
  walletOrEmpty, withdrawBlock,
} from "./lib/rules";
import type { Agreement, Clause, Invocation, TxStatus } from "./lib/types";
import {
  cancelCloseVerified, confirmCloseVerified, declineVerified, invokeVerified, openVerified, proposeVerified, ratifyVerified,
  requestCloseVerified, respondVerified, withdrawVerified,
} from "./lib/verify";

const IDLE: TxStatus = { phase: "idle", message: "" };
const STORE_KEY = "aftertheend.agreements";
const ZERO_ID = "0".repeat(64);

function readKnown(): string[] {
  try {
    return idsFromInput(window.localStorage.getItem(STORE_KEY) ?? "");
  } catch {
    return [];
  }
}

function saveKnown(ids: string[]) {
  try {
    window.localStorage.setItem(STORE_KEY, ids.join(","));
  } catch {
    /* storage unavailable: the URL still carries the open agreement */
  }
}

function agreementFromUrl(): string {
  return idsFromInput(new URLSearchParams(window.location.search).get("a") ?? "")[0] ?? "";
}

function setAgreementInUrl(id: string) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("a", id);
  else url.searchParams.delete("a");
  window.history.replaceState(null, "", url.toString());
}

const FATE_WORDS: Record<string, string> = {
  STANDING: "stands after the close",
  LAPSED: "lapses at the close",
};

const CLAUSE_LINE: Record<string, string> = {
  PROPOSED: "Proposed — binds nothing until the other side ratifies this exact text",
  RATIFIED: "Ratified by both sides",
  DECLINED: "Declined by the other side — never bound",
  WITHDRAWN: "Withdrawn by its proposer — never bound",
  VOID: "Still unratified when the agreement closed — void, never bound",
};

function Meter({ bytes }: { bytes: number }) {
  return <span className={`meter ${bytes > CALLDATA_LIMIT ? "over" : ""}`}>{bytes}/{CALLDATA_LIMIT} bytes</span>;
}

export default function App() {
  const urlId = agreementFromUrl();
  const [me, setMe] = useState("");
  const [agreementId, setAgreementId] = useState(urlId);
  const [known, setKnown] = useState<string[]>(() => {
    const list = readKnown();
    return urlId && !list.includes(urlId) ? [urlId, ...list] : list;
  });
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "missing" | "error">("idle");
  const [limits, setLimits] = useState<Limits | null>(null);

  const [openInput, setOpenInput] = useState("");
  const [other, setOther] = useState("");
  const [title, setTitle] = useState("");
  const [taken, setTaken] = useState(false);

  const [text, setText] = useState("");
  const [read, setRead] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [closeOpen, setCloseOpen] = useState(false);
  const [closeTyped, setCloseTyped] = useState("");

  const [status, setStatus] = useState<TxStatus>(IDLE);
  const [busy, setBusy] = useState(false);
  const [fresh, setFresh] = useState("");
  const recheck = useRef<{ hash: string; verify: Verify } | null>(null);

  // ---------- reads ----------
  const loadAgreement = useCallback(async (id: string) => {
    if (!id) {
      setAgreement(null);
      setClauses([]);
      setLoadState("idle");
      return;
    }
    setLoadState("loading");
    try {
      const [a, cs] = await Promise.all([getAgreement(id), getClauses(id)]);
      if (!a) {
        setAgreement(null);
        setClauses([]);
        setLoadState("missing");
        return;
      }
      setAgreement(a);
      setClauses(cs ?? []);
      setTitles((t) => ({ ...t, [id]: a.title }));
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    connectedWallet().then(setMe).catch(() => setMe(""));
    window.ethereum?.on?.("accountsChanged", (accounts: string[]) => {
      setMe((accounts?.[0] ?? "").toLowerCase());
      recheck.current = null;
      setStatus(IDLE);
      setRead({});
      setFresh("");
    });
    getLimits().then(setLimits).catch(() => setLimits(null));
  }, []);

  useEffect(() => {
    setAgreementInUrl(agreementId);
    setRead({});
    void loadAgreement(agreementId);
  }, [agreementId, loadAgreement]);

  useEffect(() => saveKnown(known), [known]);

  useEffect(() => {
    known.filter((id) => !titles[id]).forEach((id) => {
      getAgreement(id).then((a) => a && setTitles((t) => ({ ...t, [id]: a.title }))).catch(() => undefined);
    });
  }, [known, titles]);

  // ---------- derived ----------
  const otherWallet = walletOrEmpty(other);
  const newId = me && otherWallet && pyLen(pyStrip(title)) > 0 ? agreementIdOf(me, otherWallet, title) : "";
  useEffect(() => {
    let live = true;
    setTaken(false);
    if (!newId) return;
    const t = setTimeout(() => { getAgreement(newId).then((a) => live && setTaken(!!a)).catch(() => undefined); }, 400);
    return () => { live = false; clearTimeout(t); };
  }, [newId]);
  const openReason = openBlock({ me, other, title, exists: taken });

  const proposeBytes = useMemo(() => calldataBytes("propose_clause", [agreementId || ZERO_ID, pyStrip(text)]), [agreementId, text]);
  const proposeReason = agreement ? proposeBlock(agreement, clauses, me, text, proposeBytes) : UI.noWallet;
  const effect = closeEffect(clauses);
  const amSide = !!agreement && isSide(agreement, me);
  const closed = agreement?.state === "CLOSED";

  // ---------- writes ----------
  async function connect() {
    try {
      setMe(await requestWallet());
    } catch (e) {
      setStatus({ phase: "error", message: errorMessage(e) });
    }
  }

  async function runWrite(action: string, method: string, args: unknown[], verify: Verify) {
    setBusy(true);
    recheck.current = null;
    try {
      setStatus({ phase: "signing", message: "Confirm the transaction in your wallet…", action });
      const hash = await sendWrite(me, method, args, 0n);
      setStatus({ phase: "submitted", message: "Submitted. Waiting for validators to accept it…", hash, action });
      const verdict = await waitForVerdict(hash);
      if (verdict.kind === "success") setStatus({ phase: "checking", message: "Executed. Reading the accepted state…", hash, action });
      const result = await settle(verdict, verify);
      if (result.kind === "pending") recheck.current = { hash, verify };
      setStatus({ phase: result.kind === "pending" ? "delayed" : result.kind, message: result.message, hash, action });
    } catch (e) {
      setStatus({ phase: "error", message: errorMessage(e), action });
    } finally {
      setBusy(false);
    }
  }

  /** Re-reads the receipt of the SAME transaction and re-runs ITS postcondition. Never success from the receipt alone. */
  async function checkAgain() {
    const pending = recheck.current;
    if (!pending) return;
    setBusy(true);
    try {
      const result = await settle(await readVerdict(pending.hash), pending.verify);
      if (result.kind !== "pending") recheck.current = null;
      setStatus((s) => ({ ...s, phase: result.kind === "pending" ? "delayed" : result.kind, message: result.message }));
    } catch (e) {
      setStatus((s) => ({ ...s, message: errorMessage(e) }));
    } finally {
      setBusy(false);
    }
  }

  function openAgreementView(id: string) {
    setKnown((k) => [id, ...k.filter((x) => x !== id)]);
    setAgreementId(id);
  }

  function onOpenInput() {
    const id = idsFromInput(openInput)[0];
    if (!id) {
      setStatus({ phase: "error", message: "Paste a 64-character agreement id or an AfterTheEnd link.", action: "Open" });
      return;
    }
    setOpenInput("");
    openAgreementView(id);
  }

  async function onOpenAgreement() {
    if (openReason) return;
    const s = { id: agreementIdOf(me, otherWallet, title), me, other: otherWallet, title };
    if (await getAgreement(s.id)) {
      setTaken(true);
      return;
    }
    await runWrite("Open agreement", "open_agreement", [s.other, pyStrip(title)], async () => {
      const a = await getAgreement(s.id);
      if (!openVerified(a, s)) return null;
      setTitle("");
      setOther("");
      openAgreementView(s.id);
      await loadAgreement(s.id);
      return `Agreement “${a!.title}” is open between you and ${short(s.other)}. Either side can now propose clauses; share the agreement link.`;
    });
  }

  async function reload(id: string): Promise<[Agreement | null, Clause[]]> {
    const [a, cs] = await Promise.all([getAgreement(id), getClauses(id)]);
    return [a, cs ?? []];
  }

  async function onPropose() {
    if (!agreement) return;
    const [a0, cs0] = await reload(agreement.agreement_id);
    if (!a0 || proposeBlock(a0, cs0, me, text, proposeBytes)) return;
    const s = { id: clauseIdOf(a0.agreement_id, text), me, text };
    await runWrite("Propose clause", "propose_clause", [a0.agreement_id, pyStrip(text)], async () => {
      const [a, c] = await Promise.all([getAgreement(a0.agreement_id), getClause(s.id)]);
      if (!proposeVerified(a0, a, c, s)) return null;
      setText("");
      setFresh(s.id);
      await loadAgreement(a0.agreement_id);
      return `Validators read the clause as ${c!.outcome}: it ${FATE_WORDS[c!.fate]} (${c!.fate}). It binds nothing until ${short(otherSide(a0, me))} ratifies this exact text with that fate.`;
    });
  }

  async function withClause(c: Clause): Promise<[Agreement, Clause] | null> {
    const [a0, c0] = await Promise.all([getAgreement(c.agreement_id), getClause(c.clause_id)]);
    return a0 && c0 ? [a0, c0] : null;
  }

  async function onRatify(c: Clause) {
    const got = await withClause(c);
    if (!got || ratifyBlock(got[0], got[1], me, !!read[c.clause_id])) return;
    const [a0, c0] = got;
    await runWrite("Ratify", "ratify_clause", [c0.clause_id, textHashOf(c0.text)], async () => {
      const [a, cc] = await Promise.all([getAgreement(a0.agreement_id), getClause(c0.clause_id)]);
      if (!ratifyVerified(a0, c0, a, cc)) return null;
      setFresh(c0.clause_id);
      await loadAgreement(a0.agreement_id);
      return `Ratified. You signed the clause by its text hash (${short(c0.text_hash, 8, 6)}) with its fate: it ${FATE_WORDS[c0.fate]}.`;
    });
  }

  async function onDecline(c: Clause) {
    const got = await withClause(c);
    if (!got || declineBlock(got[0], got[1], me)) return;
    const [a0, c0] = got;
    await runWrite("Decline", "decline_clause", [c0.clause_id], async () => {
      const [a, cc] = await Promise.all([getAgreement(a0.agreement_id), getClause(c0.clause_id)]);
      if (!declineVerified(a0, a, cc)) return null;
      setFresh(c0.clause_id);
      await loadAgreement(a0.agreement_id);
      return "Declined. The clause never binds and its place is free for another proposal.";
    });
  }

  async function onWithdraw(c: Clause) {
    const got = await withClause(c);
    if (!got || withdrawBlock(got[1], me)) return;
    const [a0, c0] = got;
    await runWrite("Withdraw", "withdraw_clause", [c0.clause_id], async () => {
      const [a, cc] = await Promise.all([getAgreement(a0.agreement_id), getClause(c0.clause_id)]);
      if (!withdrawVerified(a0, a, cc)) return null;
      setFresh(c0.clause_id);
      await loadAgreement(a0.agreement_id);
      return "Withdrawn. The clause never binds.";
    });
  }

  async function onInvoke(c: Clause) {
    const note = notes[c.clause_id] ?? "";
    const got = await withClause(c);
    if (!got) return;
    const [a0, c0] = got;
    if (invokeBlock(a0, c0, me, note, calldataBytes("invoke_clause", [c0.clause_id, pyStrip(note)]))) return;
    await runWrite("Invoke", "invoke_clause", [c0.clause_id, pyStrip(note)], async () => {
      const cc = await getClause(c0.clause_id);
      if (!invokeVerified(c0, cc, me, note)) return null;
      setNotes((n) => ({ ...n, [c0.clause_id]: "" }));
      setFresh(c0.clause_id);
      await loadAgreement(a0.agreement_id);
      return `Invocation ${cc!.invocations.length} recorded. ${short(otherSide(a0, me))} answers it: acknowledged or contested.`;
    });
  }

  async function onRespond(c: Clause, inv: Invocation, verdict: "ACKNOWLEDGED" | "CONTESTED") {
    const key = `${c.clause_id}:${inv.index}`;
    const note = answers[key] ?? "";
    const got = await withClause(c);
    if (!got) return;
    const [a0, c0] = got;
    const inv0 = c0.invocations.find((i) => i.index === inv.index);
    if (!inv0 || respondBlock(a0, c0, inv0, me, note)) return;
    const method = verdict === "ACKNOWLEDGED" ? "acknowledge_invocation" : "contest_invocation";
    await runWrite(verdict === "ACKNOWLEDGED" ? "Acknowledge" : "Contest", method, [c0.clause_id, inv0.index, pyStrip(note)], async () => {
      const cc = await getClause(c0.clause_id);
      if (!respondVerified(cc, inv0.index, verdict, note)) return null;
      setAnswers((n) => ({ ...n, [key]: "" }));
      setFresh(c0.clause_id);
      await loadAgreement(a0.agreement_id);
      return `Invocation ${inv0.index} ${verdict.toLowerCase()} with your note.`;
    });
  }

  async function onRequestClose() {
    if (!agreement) return;
    const a0 = await getAgreement(agreement.agreement_id);
    if (!a0 || requestCloseBlock(a0, me) || closeTyped !== "CLOSE") return;
    setCloseOpen(false);
    setCloseTyped("");
    await runWrite("Ask to close", "request_close", [a0.agreement_id], async () => {
      const a = await getAgreement(a0.agreement_id);
      if (!requestCloseVerified(a, me)) return null;
      await loadAgreement(a0.agreement_id);
      return `Close requested. Nothing has closed yet: ${short(otherSide(a0, me))} must confirm, and you can cancel the request until then.`;
    });
  }

  async function onCancelClose() {
    if (!agreement) return;
    const a0 = await getAgreement(agreement.agreement_id);
    if (!a0 || cancelCloseBlock(a0, me)) return;
    await runWrite("Cancel close", "cancel_close", [a0.agreement_id], async () => {
      const a = await getAgreement(a0.agreement_id);
      if (!cancelCloseVerified(a)) return null;
      await loadAgreement(a0.agreement_id);
      return "Close request cancelled. The agreement is live again.";
    });
  }

  async function onConfirmClose() {
    if (!agreement) return;
    const a0 = await getAgreement(agreement.agreement_id);
    if (!a0 || confirmCloseBlock(a0, me) || closeTyped !== "CLOSE") return;
    setCloseOpen(false);
    setCloseTyped("");
    await runWrite("Confirm close", "confirm_close", [a0.agreement_id], async () => {
      const [a, cs] = await Promise.all([getAgreement(a0.agreement_id), getClauses(a0.agreement_id)]);
      if (!confirmCloseVerified(a0, a, cs, me)) return null;
      await loadAgreement(a0.agreement_id);
      return `Closed by both sides. ${a!.standing_count} ratified clause(s) stand and stay open to invoke; ${a!.lapsed_count} lapsed; proposals still unratified are void.`;
    });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setStatus({ phase: "success", message: "Agreement link copied. The other side opens it with their own wallet.", action: "Share" });
    } catch {
      setStatus({ phase: "error", message: "Could not copy; copy the address bar instead.", action: "Share" });
    }
  }

  // ---------- one clause row (a render function, not a component: inputs keep focus) ----------
  function renderClause(a: Agreement, c: Clause, i: number) {
    const note = notes[c.clause_id] ?? "";
    const invokeBytes = calldataBytes("invoke_clause", [c.clause_id, pyStrip(note)]);
    const iReason = invokeBlock(a, c, me, note, invokeBytes);
    const rReason = ratifyBlock(a, c, me, !!read[c.clause_id]);
    const dReason = declineBlock(a, c, me);
    const wReason = withdrawBlock(c, me);
    const bound = c.state === "RATIFIED";
    const dead = !bound && c.state !== "PROPOSED";
    const lapsedNow = bound && !c.invocable;
    const iAmProposer = same(c.proposer, me);
    return (
      <tr key={c.clause_id} className={`st-${c.state.toLowerCase()} ${dead || lapsedNow ? "dead" : ""} ${fresh === c.clause_id ? "fresh" : ""}`}>
        <td className="num">{i + 1}</td>
        <td>
          <div className="clause-text" title={escapeHtml(c.text)}>{c.text}</div>
          <div className="cid">
            id <code>{short(c.clause_id, 10, 6)}</code> · proposed by <code>{short(c.proposer)}</code>{iAmProposer ? " (you)" : ""}
            {fresh === c.clause_id && <span className="new"> updated</span>}
          </div>
          <div className={`state-line st-line-${c.state.toLowerCase()}`}>{CLAUSE_LINE[c.state] ?? c.state}</div>
          {bound && closed && (
            <div className={lapsedNow ? "sentence lapsed" : "sentence stands"}>
              {lapsedNow ? REVERTS.lapsed : "This clause stands after the close; it is still open to invoke"}
            </div>
          )}
          {c.invocations.length > 0 && (
            <ul className="invocations">
              {c.invocations.map((inv) => {
                const key = `${c.clause_id}:${inv.index}`;
                const answer = answers[key] ?? "";
                const reason = respondBlock(a, c, inv, me, answer);
                const canAnswer = reason === null || reason === REVERTS.noteEmpty || reason === REVERTS.noteTooLong;
                return (
                  <li key={key}>
                    <span className="inv-head">
                      Invocation {inv.index} by <code>{short(inv.by)}</code>{same(inv.by, me) ? " (you)" : ""} · <b className={`inv-${inv.state.toLowerCase()}`}>{inv.state}</b>
                    </span>
                    <span className="inv-note">“{inv.note}”</span>
                    {inv.response_note && <span className={`answer inv-${inv.state.toLowerCase()}`}>Answer: “{inv.response_note}”</span>}
                    {inv.state === "PENDING" && canAnswer && (
                      <span className="contest-form">
                        <input aria-label={`Answer to invocation ${inv.index}`} placeholder="Answer note" value={answer}
                          onChange={(e) => setAnswers((n) => ({ ...n, [key]: e.target.value }))} />
                        <button disabled={busy || reason !== null} onClick={() => onRespond(c, inv, "ACKNOWLEDGED")}>Acknowledge</button>
                        <button className="ghost" disabled={busy || reason !== null} onClick={() => onRespond(c, inv, "CONTESTED")}>Contest</button>
                        {answer && reason && <span className="why">{reason}</span>}
                      </span>
                    )}
                    {inv.state === "PENDING" && !canAnswer && <span className="mini">{reason}</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </td>
        <td>
          <span className={`fate fate-badge-${c.fate.toLowerCase()}`}>{c.fate}</span>
          <div className="mini">{c.outcome}</div>
        </td>
        <td className="invoke">
          {c.state === "PROPOSED" && !iAmProposer && amSide && (
            <>
              <label className="check">
                <input type="checkbox" checked={!!read[c.clause_id]} onChange={(e) => setRead((r) => ({ ...r, [c.clause_id]: e.target.checked }))} />
                <span>I read this exact clause and accept that it <b>{FATE_WORDS[c.fate]}</b>.</span>
              </label>
              <div className="row tight">
                <button disabled={busy || rReason !== null} onClick={() => onRatify(c)}>Ratify</button>
                <button className="ghost" disabled={busy || dReason !== null} onClick={() => onDecline(c)}>Decline</button>
              </div>
              {rReason && rReason !== UI.notRead && <div className="why">{rReason}</div>}
            </>
          )}
          {c.state === "PROPOSED" && iAmProposer && (
            <>
              <p className="mini">Waiting for {short(otherSide(a, me))} to ratify or decline.</p>
              <button className="ghost" disabled={busy || wReason !== null} onClick={() => onWithdraw(c)}>Withdraw</button>
            </>
          )}
          {c.state === "PROPOSED" && !amSide && <div className="why">{me ? REVERTS.sides : UI.noWallet}</div>}
          {bound && (
            <>
              {!lapsedNow && (
                <input aria-label={`Invocation note for clause ${i + 1}`} placeholder="Invocation note" value={note}
                  onChange={(e) => setNotes((n) => ({ ...n, [c.clause_id]: e.target.value }))} />
              )}
              <button disabled={busy || iReason !== null} onClick={() => onInvoke(c)}>Invoke</button>
              {iReason && (note || iReason !== REVERTS.noteEmpty) && <div className="why">{iReason}</div>}
              {!lapsedNow && <div className="mini">{pyLen(pyStrip(note))}/{MAX_NOTE_LENGTH} · <Meter bytes={invokeBytes} /></div>}
            </>
          )}
          {dead && <span className="mini">Nothing to do: it never bound.</span>}
        </td>
      </tr>
    );
  }

  const requestReason = agreement ? requestCloseBlock(agreement, me) : UI.noWallet;
  const cancelReason = agreement ? cancelCloseBlock(agreement, me) : UI.noWallet;
  const confirmReason = agreement ? confirmCloseBlock(agreement, me) : UI.noWallet;
  const closeMode: "request" | "confirm" = agreement?.state === "CLOSING" ? "confirm" : "request";

  // ---------- view ----------
  return (
    <div className={closed ? "app closed" : "app"}>
      <header className="top">
        <div>
          <h1 className="brand"><img src="/logo-192.png" alt="" width={40} height={40} />AfterTheEnd</h1>
          <p className="lede">
            Two sides keep one register of clauses. Validators read each clause once for whether it reaches past the end of
            the agreement. A clause binds only when the other side ratifies its exact text, and the agreement closes only when
            both sides sign: then the register splits into clauses that still bind and clauses that do not.
          </p>
        </div>
        <div className="wallet">
          {me ? <span className="pill">Wallet {short(me)}</span> : <button onClick={connect}>Connect MetaMask</button>}
          <span className="pill muted">StudioNet · 61999</span>
        </div>
      </header>

      {!CONTRACT_ADDRESS && <div className="notice">No contract address configured.</div>}

      <section className="card two-up">
        <div>
          <h2>Open an agreement</h2>
          <p className="hint">Paste an agreement id or link, or pick one you used here.</p>
          <div className="row">
            <input className="mono" aria-label="Agreement id" placeholder="Agreement id or link" value={openInput}
              onChange={(e) => setOpenInput(e.target.value)} spellCheck={false} />
            <button onClick={onOpenInput}>Open</button>
          </div>
          {known.length > 0 && (
            <div className="chips">
              {known.map((id) => (
                <button key={id} className={`chip ${id === agreementId ? "on" : ""}`} onClick={() => openAgreementView(id)}>
                  {titles[id] ?? short(id, 8, 6)}
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <h2>New agreement</h2>
          <p className="hint">You and one other wallet. The same two wallets can open another agreement under another title.</p>
          <label>
            Other side's wallet
            <input className="mono" placeholder="0x…" value={other} onChange={(e) => setOther(e.target.value)} spellCheck={false} />
          </label>
          <label>
            Title
            <input placeholder="Website build" value={title} onChange={(e) => setTitle(e.target.value)} />
            <span className="mini">{pyLen(pyStrip(title))}/{MAX_TITLE_LENGTH}</span>
          </label>
          <button disabled={busy || openReason !== null} onClick={onOpenAgreement}>Open agreement</button>
          {(other || title) && openReason && <span className="why">{openReason}</span>}
          {newId && <p className="ids">Agreement id: <code>{newId}</code></p>}
        </div>
      </section>

      {loadState === "loading" && !agreement && <section className="card"><p className="hint">Reading the agreement…</p></section>}
      {loadState === "missing" && <section className="card"><p className="why">{REVERTS.unknownAgreement}</p></section>}
      {loadState === "error" && <section className="card"><p className="why">Could not read this agreement. Try again.</p></section>}

      {agreement && (
        <section className="card ledger">
          <div className={`banner banner-${agreement.state.toLowerCase()}`}>
            <div className="banner-state">{agreement.state}</div>
            <div className="banner-meta">
              {agreement.state === "LIVE" && <>Clauses bind only once both sides have signed them. Either side may ask to close; the other must confirm.</>}
              {agreement.state === "CLOSING" && (
                <>Close requested by <code>{short(agreement.close_requested_by)}</code>{same(agreement.close_requested_by, me) ? " (you)" : ""}. Not closed until <code>{short(otherSide(agreement, agreement.close_requested_by))}</code> confirms. Ratified clauses stay invocable meanwhile.</>
              )}
              {closed && (
                <>Closed by both sides: requested by <code>{short(agreement.close_requested_by)}</code>, confirmed by <code>{short(agreement.closed_by)}</code>.</>
              )}
            </div>
          </div>
          <h2 className="agreement-title">{agreement.title}</h2>
          <div className="counts">
            Standing: {agreement.standing_count} · Lapsed: {agreement.lapsed_count} · Awaiting ratification: {clauses.filter((c) => c.state === "PROPOSED").length}
          </div>
          <p className="ids">
            Agreement <code>{agreement.agreement_id}</code> · sides <code>{short(agreement.party_a)}</code> and <code>{short(agreement.party_b)}</code> ·
            you are <strong>{amSide ? "a side" : me ? "not a side" : "not connected"}</strong>
            {" · "}<button className="linkish" onClick={copyLink}>Copy agreement link</button>
          </p>

          {clauses.length === 0 ? (
            <p className="hint">No clause yet. Either side can propose the first one below.</p>
          ) : (
            <table className="register">
              <thead>
                <tr><th>#</th><th>Clause</th><th>Fate</th><th>Action</th></tr>
              </thead>
              <tbody>{clauses.map((c, i) => renderClause(agreement, c, i))}</tbody>
            </table>
          )}

          <div className="record">
            <h3>Propose a clause</h3>
            <label>
              Clause text
              <textarea value={text} rows={3} onChange={(e) => setText(e.target.value)}
                placeholder="Confidentiality continues after the arrangement ends." />
              <span className="mini">{pyLen(pyStrip(text))}/{MAX_TEXT_LENGTH} · <Meter bytes={proposeBytes} /></span>
            </label>
            <button disabled={busy || proposeReason !== null} onClick={onPropose}>Propose clause</button>
            {text && proposeReason && <span className="why">{proposeReason}</span>}
            {!text && proposeReason && proposeReason !== REVERTS.textEmpty && <span className="why">{proposeReason}</span>}
            <p className="hint">
              Validators read only the clause text — no wallet, no title, nothing about the agreement. Its fate is frozen at
              proposal; the other side ratifies the text and that fate together, or declines.
            </p>
          </div>

          <div className="close-zone">
            {agreement.state === "LIVE" && (
              <>
                <button className="danger" disabled={busy || requestReason !== null} onClick={() => setCloseOpen(true)}>Ask to close…</button>
                {requestReason ? <span className="why">{requestReason}</span> : <span className="hint"> The other side must confirm before anything closes.</span>}
              </>
            )}
            {agreement.state === "CLOSING" && (
              <>
                <button className="danger" disabled={busy || confirmReason !== null} onClick={() => setCloseOpen(true)}>Confirm close…</button>
                <button className="ghost" disabled={busy || cancelReason !== null} onClick={onCancelClose}>Cancel close request</button>
                {confirmReason && <span className="why">{confirmReason}</span>}
                {!confirmReason && <span className="hint"> Confirming is the second signature; the close cannot be undone.</span>}
              </>
            )}
            {closed && <span className="hint">Closed by both sides. No clause can be proposed or ratified; STANDING clauses stay open to invoke.</span>}
          </div>
        </section>
      )}

      {status.phase !== "idle" && (
        <section className={`card tx tx-${status.phase}`} aria-live="polite">
          <strong>{status.action ? `${status.action} · ` : ""}{status.phase === "delayed" ? "submitted — confirmation delayed" : status.phase}</strong>
          <span>{status.message}</span>
          {status.hash && (
            <a href={`${EXPLORER_BASE}/tx/${status.hash}`} target="_blank" rel="noreferrer"><code>{status.hash}</code></a>
          )}
          {status.phase === "delayed" && recheck.current && <button onClick={checkAgain} disabled={busy}>Check again</button>}
        </section>
      )}

      {closeOpen && agreement && (
        <div className="modal-back" role="dialog" aria-modal="true" aria-label={closeMode === "request" ? "Ask to close the agreement" : "Confirm closing the agreement"}>
          <div className="modal">
            <h2>{closeMode === "request" ? "Ask to close this agreement?" : "Confirm the close?"}</h2>
            <p>
              {closeMode === "request"
                ? <>This only <strong>asks</strong>: nothing closes until <code>{short(otherSide(agreement, me))}</code> confirms, and you can cancel until then. If they confirm:</>
                : <>This is the <strong>second signature</strong>. The agreement closes for good. At the close:</>}
            </p>
            <p className="modal-h">Lapse and can never be invoked again</p>
            {effect.lapsing.length === 0 ? <p className="hint">None.</p> : (
              <ol className="lapsing">{effect.lapsing.map((c) => <li key={c.clause_id}>{c.text} <span className="fate fate-badge-lapsed">LAPSED</span></li>)}</ol>
            )}
            <p className="modal-h">Become void (never ratified)</p>
            {effect.voiding.length === 0 ? <p className="hint">None.</p> : (
              <ol className="lapsing">{effect.voiding.map((c) => <li key={c.clause_id}>{c.text} <span className="fate">VOID</span></li>)}</ol>
            )}
            <p className="hint">
              {effect.standing.length} ratified clause{effect.standing.length === 1 ? "" : "s"} will stand and stay open to invoke. Past invocations and answers stay on record.
            </p>
            <label>
              Type <code>CLOSE</code> to continue
              <input value={closeTyped} onChange={(e) => setCloseTyped(e.target.value)} autoFocus />
            </label>
            <div className="row">
              <button className="danger" disabled={closeTyped !== "CLOSE" || busy}
                onClick={closeMode === "request" ? onRequestClose : onConfirmClose}>
                {closeMode === "request" ? "Ask to close" : "Confirm close"}
              </button>
              <button className="ghost" onClick={() => { setCloseOpen(false); setCloseTyped(""); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <footer className="foot">
        Contract{" "}
        {CONTRACT_ADDRESS ? (
          <a href={`${EXPLORER_BASE}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer"><code>{CONTRACT_ADDRESS}</code></a>
        ) : "not configured"}{" "}
        · source SHA-256 <code>{short(SOURCE_SHA256, 10, 6)}</code>
        {limits && <> · {limits.contract_name} {limits.version} · rubric <code>{short(limits.rubric_hash ?? "", 8, 6)}</code> · prompt inputs: {(limits.prompt_inputs ?? []).join(", ")}</>}
        {" "}· GenLayer StudioNet · holds no funds and enforces nothing off-chain.
      </footer>
    </div>
  );
}
