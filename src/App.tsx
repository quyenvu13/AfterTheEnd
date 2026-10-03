import { useCallback, useEffect, useMemo, useState } from "react";
import { CONTRACT_ADDRESS, EXPLORER_BASE } from "./lib/config";
import { calldataBytes, CALLDATA_LIMIT } from "./lib/calldata";
import { errorMessage } from "./lib/errors";
import { escapeHtml } from "./lib/escape";
import {
  connectedWallet,
  ensureStudioNet,
  getAgreement,
  getClause,
  getClauses,
  getInvocations,
  requestWallet,
  sendWrite,
  waitForVerdict,
} from "./lib/genlayer";
import { agreementId, clauseId, short } from "./lib/ids";
import { pyLen, pyStrip } from "./lib/pytext";
import {
  closeBlock,
  contestBlock,
  fateSentence,
  invokeBlock,
  MAX_LABEL_LENGTH,
  MAX_NOTE_LENGTH,
  MAX_TEXT_LENGTH,
  normalizeWallet,
  recordBlock,
  REVERTS,
} from "./lib/rules";
import type { Agreement, Clause, Invocation, TxStatus } from "./lib/types";
import { closeVerified, contestVerified, invokeVerified, recordVerified } from "./lib/verify";

type Loaded = { agreement: Agreement | null; clauses: Clause[]; invocations: Record<string, Invocation[]> };

const EMPTY: Loaded = { agreement: null, clauses: [], invocations: {} };

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function Meter({ bytes }: { bytes: number }) {
  const over = bytes > CALLDATA_LIMIT;
  return (
    <span className={over ? "meter over" : "meter"} title="GenLayer calldata size; the RPC rejects more than 255 bytes">
      {bytes} / {CALLDATA_LIMIT} bytes
    </span>
  );
}

export default function App() {
  const [me, setMe] = useState("");
  const [counterpartInput, setCounterpartInput] = useState("");
  const [counterpart, setCounterpart] = useState("");
  const [loaded, setLoaded] = useState<Loaded>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [label, setLabel] = useState("");
  const [text, setText] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [contestNotes, setContestNotes] = useState<Record<string, string>>({});
  const [tx, setTx] = useState<TxStatus>({ phase: "idle", message: "" });
  const [pendingHash, setPendingHash] = useState("");
  const [lastCreated, setLastCreated] = useState("");
  const [closeOpen, setCloseOpen] = useState(false);
  const [closeTyped, setCloseTyped] = useState("");
  const [probeExists, setProbeExists] = useState(false);

  const busy = tx.phase === "checking" || tx.phase === "signing" || tx.phase === "submitted" || pendingHash !== "";

  useEffect(() => {
    connectedWallet().then(setMe).catch(() => undefined);
    window.ethereum?.on?.("accountsChanged", (accounts: string[]) => setMe((accounts?.[0] ?? "").toLowerCase()));
  }, []);

  const ids = useMemo(() => {
    if (!me || !counterpart) return null;
    return { asAuthor: agreementId(me, counterpart), asOther: agreementId(counterpart, me) };
  }, [me, counterpart]);

  const agreement = loaded.agreement;
  const role = !agreement || !me ? "none" : me === agreement.author ? "author" : me === agreement.other_wallet ? "other" : "none";

  const reload = useCallback(async (): Promise<Loaded> => {
    if (!ids) {
      setLoaded(EMPTY);
      return EMPTY;
    }
    const a = (await getAgreement(ids.asAuthor)) ?? (await getAgreement(ids.asOther));
    if (!a) {
      setLoaded(EMPTY);
      return EMPTY;
    }
    const clauses = await getClauses(a.agreement_id);
    const invocations: Record<string, Invocation[]> = {};
    for (const c of clauses) invocations[c.clause_id] = await getInvocations(c);
    const next = { agreement: a, clauses, invocations };
    setLoaded(next);
    return next;
  }, [ids]);

  useEffect(() => {
    setLoading(true);
    reload().catch((e) => setTx({ phase: "error", message: errorMessage(e) })).finally(() => setLoading(false));
  }, [reload]);

  // Record form inputs. For an existing agreement the label is the one stored on it.
  const effectiveLabel = agreement ? agreement.other_label : label;
  const recordWallet = agreement && role === "author" ? agreement.other_wallet : counterpart;
  const localAgreementId = ids ? (agreement ? agreement.agreement_id : ids.asAuthor) : "";
  const localClauseId = localAgreementId && pyStrip(text) ? clauseId(localAgreementId, text) : "";

  // Accepted-state probe: does this exact clause already exist? Checked before any send.
  useEffect(() => {
    let cancelled = false;
    setProbeExists(false);
    if (!localClauseId || !CONTRACT_ADDRESS) return;
    const t = setTimeout(() => {
      getClause(localClauseId).then((c) => !cancelled && setProbeExists(!!c)).catch(() => undefined);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [localClauseId]);

  const recordReason = me
    ? recordBlock({ me, otherWallet: recordWallet, label: effectiveLabel, text, agreement, clauseExists: probeExists })
    : "Connect a wallet first";
  const recordBytes = calldataBytes("record_clause", [recordWallet || "0x" + "0".repeat(40), effectiveLabel, text]);

  async function connect() {
    try {
      const w = await requestWallet();
      await ensureStudioNet();
      setMe(w);
    } catch (e) {
      setTx({ phase: "error", message: errorMessage(e) });
    }
  }

  function loadCounterpart() {
    const check = normalizeWallet(counterpartInput);
    if (!check.ok) {
      setTx({ phase: "error", message: check.reason });
      return;
    }
    setTx({ phase: "idle", message: "" });
    setCounterpart(check.wallet);
  }

  /**
   * Receipt first, then the postcondition on reloaded accepted state.
   * A missing execution result is never reported as success.
   */
  async function runWrite(
    what: string,
    send: () => Promise<string>,
    verified: (state: Loaded) => Promise<boolean> | boolean,
  ) {
    let hash = "";
    try {
      setTx({ phase: "signing", message: `${what}: confirm in your wallet…` });
      hash = await send();
      setPendingHash(hash);
      setTx({ phase: "submitted", message: `${what}: submitted, waiting for the leader receipt…`, hash });
      await finish(what, hash, verified);
    } catch (e) {
      setTx({ phase: "error", message: errorMessage(e), hash: hash || undefined });
      setPendingHash("");
    }
  }

  async function finish(what: string, hash: string, verified: (state: Loaded) => Promise<boolean> | boolean) {
    const verdict = await waitForVerdict(hash);
    if (verdict.kind === "pending") {
      setTx({
        phase: "delayed",
        message: "Submitted — confirmation delayed. Do not resend; check again in a moment.",
        hash,
      });
      return; // pendingHash stays set: every write stays locked until this one resolves
    }
    if (verdict.kind === "error") {
      setPendingHash("");
      await reload();
      setTx({ phase: "error", message: `${what} reverted: ${verdict.reason}`, hash });
      return;
    }
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const state = await reload();
      if (await verified(state)) {
        setPendingHash("");
        setTx({ phase: "success", message: `${what}: executed, and the accepted state shows the change.`, hash });
        return;
      }
      await sleep(3000);
    }
    setPendingHash("");
    setTx({
      phase: "error",
      message: `${what}: the receipt reports success but the accepted state does not show the expected change yet. Reload before acting again.`,
      hash,
    });
  }

  async function checkAgain() {
    if (!pendingHash) return;
    setTx({ phase: "submitted", message: "Checking the receipt again…", hash: pendingHash });
    await finish("Pending transaction", pendingHash, async () => true);
  }

  async function onRecord() {
    if (!me || !ids) return;
    setTx({ phase: "checking", message: "Checking the accepted state before sending…" });
    // Fresh probe right before sending: closed, full or duplicate never reach the wallet.
    const before = (await getAgreement(localAgreementId)) ?? null;
    const exists = !!(await getClause(localClauseId));
    const reason = recordBlock({ me, otherWallet: recordWallet, label: effectiveLabel, text, agreement: before, clauseExists: exists });
    if (reason) {
      setProbeExists(exists);
      setTx({ phase: "error", message: reason });
      return;
    }
    if (recordBytes > CALLDATA_LIMIT) {
      setTx({ phase: "error", message: `Calldata is ${recordBytes} bytes; the RPC rejects more than ${CALLDATA_LIMIT}. Shorten the text.` });
      return;
    }
    const wallet = normalizeWallet(recordWallet);
    const submitted = {
      me,
      otherWallet: wallet.ok ? wallet.wallet : "",
      label: effectiveLabel,
      text,
      agreementId: localAgreementId,
      clauseId: localClauseId,
    };
    setLastCreated(localClauseId);
    await runWrite(
      "Record clause",
      () => sendWrite(me, "record_clause", [submitted.otherWallet, pyStrip(effectiveLabel), pyStrip(text)]),
      async (state) => recordVerified(before, state.agreement, await getClause(submitted.clauseId), submitted),
    );
    setText("");
  }

  async function onInvoke(c: Clause) {
    if (!agreement) return;
    const note = notes[c.clause_id] ?? "";
    const before = c.invocation_count;
    await runWrite(
      "Invoke clause",
      () => sendWrite(me, "invoke_clause", [c.clause_id, pyStrip(note)]),
      (state) => {
        const after = state.clauses.find((x) => x.clause_id === c.clause_id) ?? null;
        const inv = (state.invocations[c.clause_id] ?? []).find((i) => i.index === before + 1) ?? null;
        return invokeVerified(before, after, inv, me, note);
      },
    );
    setNotes((n) => ({ ...n, [c.clause_id]: "" }));
  }

  async function onClose() {
    if (!agreement) return;
    const counterpartWallet = role === "author" ? agreement.other_wallet : agreement.author;
    setCloseOpen(false);
    setCloseTyped("");
    await runWrite(
      "Close agreement",
      () => sendWrite(me, "close_agreement", [counterpartWallet]),
      (state) => closeVerified(state.agreement, me),
    );
  }

  async function onContest(c: Clause, inv: Invocation) {
    const key = `${c.clause_id}:${inv.index}`;
    const note = contestNotes[key] ?? "";
    await runWrite(
      "Contest invocation",
      () => sendWrite(me, "contest_invocation", [c.clause_id, inv.index, pyStrip(note)]),
      (state) => contestVerified((state.invocations[c.clause_id] ?? []).find((i) => i.index === inv.index) ?? null, note),
    );
    setContestNotes((n) => ({ ...n, [key]: "" }));
  }

  const closeReason = closeBlock(agreement, me);
  const lapsing = loaded.clauses.filter((c) => c.fate === "LAPSED");
  const standing = loaded.clauses.filter((c) => c.fate === "STANDING");
  const closed = agreement?.state === "CLOSED";

  return (
    <div className={closed ? "app closed" : "app"}>
      <header className="top">
        <div>
          <h1 className="brand"><img src="/logo-192.png" alt="" width={40} height={40} />AfterTheEnd</h1>
          <p className="lede">
            Each clause is read once for whether it reaches past the end of the agreement. One closing transaction
            then splits the register into clauses that still bind and clauses that do not.
          </p>
        </div>
        <div className="wallet">
          {me ? <span className="pill">Wallet {short(me)}</span> : <button onClick={connect}>Connect MetaMask</button>}
          <span className="pill muted">StudioNet · 61999</span>
        </div>
      </header>

      {!CONTRACT_ADDRESS && (
        <div className="notice">No contract address configured.</div>
      )}

      <section className="card">
        <h2>Open an agreement</h2>
        <p className="hint">
          An agreement is one pair of wallets. Enter the other wallet: if you are its author, enter the other side;
          if you are the other side, enter the author. Holds no funds.
        </p>
        <div className="row">
          <input
            placeholder="0x… wallet of the other party"
            value={counterpartInput}
            onChange={(e) => setCounterpartInput(e.target.value)}
            spellCheck={false}
          />
          <button onClick={loadCounterpart} disabled={!me}>Load</button>
        </div>
        {!me && <p className="why">Connect a wallet first</p>}
        {ids && (
          <p className="ids">
            Agreement id (you as author): <code>{ids.asAuthor}</code>
          </p>
        )}
      </section>

      {counterpart && me && (
        <section className="card ledger">
          {loading && <p className="hint">Loading accepted state…</p>}

          {agreement ? (
            <>
              <div className={closed ? "banner banner-closed" : "banner banner-live"}>
                <div className="banner-state">{agreement.state}</div>
                <div className="banner-meta">
                  {closed ? (
                    <>
                      Closed by <code>{short(agreement.closed_by)}</code>
                      {agreement.closed_by === agreement.author ? " (author)" : " (other side)"} at{" "}
                      <code>{agreement.closed_at}</code>
                    </>
                  ) : (
                    <>Every clause can be invoked by either side until the agreement is closed.</>
                  )}
                </div>
              </div>
              <div className="counts">
                Standing: {agreement.standing_count} · Lapsed: {agreement.lapsed_count}
              </div>
              <p className="ids">
                Agreement <code>{agreement.agreement_id}</code> · author <code>{short(agreement.author)}</code> · other
                side <code>{short(agreement.other_wallet)}</code> ({agreement.other_label}) · you are{" "}
                <strong>{role === "author" ? "the author" : role === "other" ? "the other side" : "not a side"}</strong>
              </p>

              <table className="register">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Clause</th>
                    <th>Fate</th>
                    <th>Invoke</th>
                  </tr>
                </thead>
                <tbody>
                  {loaded.clauses.map((c, i) => {
                    const note = notes[c.clause_id] ?? "";
                    const reason = invokeBlock(agreement, c, me, note);
                    const sentence = fateSentence(agreement.state, c.fate);
                    const dead = sentence !== null && !c.invocable;
                    const invs = loaded.invocations[c.clause_id] ?? [];
                    return (
                      <tr key={c.clause_id} className={`fate-${c.fate.toLowerCase()} ${dead ? "dead" : ""}`}>
                        <td className="num">{i + 1}</td>
                        <td>
                          <div className="clause-text" title={escapeHtml(c.text)}>{c.text}</div>
                          <div className="cid">
                            id <code>{short(c.clause_id, 10, 6)}</code>
                            {lastCreated === c.clause_id && <span className="new"> just recorded</span>}
                          </div>
                          {sentence && <div className={dead ? "sentence lapsed" : "sentence stands"}>{sentence}</div>}
                          {invs.length > 0 && (
                            <ul className="invocations">
                              {invs.map((inv) => {
                                const key = `${c.clause_id}:${inv.index}`;
                                const cnote = contestNotes[key] ?? "";
                                const creason = contestBlock(agreement, c, inv, inv.index, me, cnote);
                                const permanent =
                                  creason !== null && creason !== "Note is empty" && creason !== "Note is too long";
                                return (
                                  <li key={key}>
                                    <span className="inv-head">
                                      Invocation {inv.index} by <code>{short(inv.by)}</code>
                                      {inv.by === agreement.author ? " (author)" : " (other side)"}
                                    </span>
                                    <span className="inv-note">“{inv.note}”</span>
                                    {inv.contested ? (
                                      <span className="contest">Contested: “{inv.contest_note}”</span>
                                    ) : permanent ? null : (
                                      <span className="contest-form">
                                        <input
                                          placeholder="Contest note"
                                          value={cnote}
                                          maxLength={MAX_NOTE_LENGTH * 2}
                                          onChange={(e) => setContestNotes((n) => ({ ...n, [key]: e.target.value }))}
                                        />
                                        <button disabled={busy || creason !== null} onClick={() => onContest(c, inv)}>
                                          Contest
                                        </button>
                                        {creason && <span className="why">{creason}</span>}
                                      </span>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </td>
                        <td>
                          <span className={`fate fate-badge-${c.fate.toLowerCase()}`}>{c.fate}</span>
                        </td>
                        <td className="invoke">
                          {!dead && (
                            <input
                              placeholder="Invocation note"
                              value={note}
                              maxLength={MAX_NOTE_LENGTH * 2}
                              onChange={(e) => setNotes((n) => ({ ...n, [c.clause_id]: e.target.value }))}
                            />
                          )}
                          <button disabled={busy || reason !== null} onClick={() => onInvoke(c)}>
                            Invoke
                          </button>
                          {reason && <div className="why">{reason}</div>}
                          {!dead && (
                            <div className="mini">
                              {pyLen(pyStrip(note))}/{MAX_NOTE_LENGTH} · <Meter bytes={calldataBytes("invoke_clause", [c.clause_id, note])} />
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="close-zone">
                <button className="danger" disabled={busy || closeReason !== null} onClick={() => setCloseOpen(true)}>
                  Close agreement…
                </button>
                {closeReason && <span className="why">{closeReason}</span>}
                {!closeReason && <span className="hint"> One transaction, either side, cannot be undone.</span>}
              </div>
            </>
          ) : (
            !loading && (
              <p className="hint">
                No agreement between you and <code>{short(counterpart)}</code> yet. Record the first clause below to
                open it; you become its author.
              </p>
            )
          )}

          {role === "author" && closed && (
            <div className="record">
              <h3>Record a clause</h3>
              <button disabled>Record clause</button>
              <span className="why">{REVERTS.recordAfterClose}</span>
            </div>
          )}
          {((role === "author" && !closed) || !agreement) && (
            <div className="record">
              <h3>Record a clause</h3>
              <label>
                Label for the other side
                <input
                  value={effectiveLabel}
                  disabled={!!agreement}
                  placeholder="how the clause text refers to them"
                  onChange={(e) => setLabel(e.target.value)}
                />
                <span className="mini">{pyLen(pyStrip(effectiveLabel))}/{MAX_LABEL_LENGTH}</span>
              </label>
              <label>
                Clause text
                <textarea value={text} rows={3} onChange={(e) => setText(e.target.value)} />
                <span className="mini">
                  {pyLen(pyStrip(text))}/{MAX_TEXT_LENGTH} · <Meter bytes={recordBytes} />
                </span>
              </label>
              {localClauseId && (
                <p className="ids">
                  Clause id if recorded: <code>{localClauseId}</code>
                </p>
              )}
              <button disabled={busy || recordReason !== null || recordBytes > CALLDATA_LIMIT} onClick={onRecord}>
                Record clause
              </button>
              {recordReason && <span className="why">{recordReason}</span>}
              {!recordReason && recordBytes > CALLDATA_LIMIT && (
                <span className="why">Calldata over {CALLDATA_LIMIT} bytes; shorten the text.</span>
              )}
              <p className="hint">
                The model reads the clause once. Its fate is frozen and no method changes it later.
              </p>
            </div>
          )}
          {role === "other" && (
            <p className="hint">
              Clauses in this agreement are recorded by its author. Recording from your wallet would open a separate
              agreement in which you are the author.
            </p>
          )}
        </section>
      )}

      {tx.phase !== "idle" && (
        <section className={`card tx tx-${tx.phase}`}>
          <strong>{tx.phase === "delayed" ? "Submitted — confirmation delayed" : tx.phase}</strong>
          <span>{tx.message}</span>
          {tx.hash && (
            <a href={`${EXPLORER_BASE}/tx/${tx.hash}`} target="_blank" rel="noreferrer">
              <code>{tx.hash}</code>
            </a>
          )}
          {tx.phase === "delayed" && <button onClick={checkAgain}>Check again</button>}
        </section>
      )}

      {closeOpen && agreement && (
        <div className="modal-back" role="dialog" aria-modal="true" aria-label="Confirm closing the agreement">
          <div className="modal">
            <h2>Close this agreement?</h2>
            <p>
              Closing is one transaction and cannot be undone. No clause can be added afterwards. These clauses{" "}
              <strong>lapse at the close</strong> and can never be invoked again:
            </p>
            {lapsing.length === 0 ? (
              <p className="hint">None — every clause in this agreement stands after the close.</p>
            ) : (
              <ol className="lapsing">
                {lapsing.map((c) => (
                  <li key={c.clause_id}>
                    {c.text} <span className="fate fate-badge-lapsed">LAPSED</span>
                  </li>
                ))}
              </ol>
            )}
            <p className="hint">
              {standing.length} clause{standing.length === 1 ? "" : "s"} will stand and stay open to invoke. Past
              invocations and contests stay on record.
            </p>
            <label>
              Type <code>CLOSE</code> to confirm
              <input value={closeTyped} onChange={(e) => setCloseTyped(e.target.value)} autoFocus />
            </label>
            <div className="row">
              <button className="danger" disabled={closeTyped !== "CLOSE" || busy} onClick={onClose}>
                Close agreement
              </button>
              <button className="ghost" onClick={() => { setCloseOpen(false); setCloseTyped(""); }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="foot">
        Contract{" "}
        {CONTRACT_ADDRESS ? (
          <a href={`${EXPLORER_BASE}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">
            <code>{CONTRACT_ADDRESS}</code>
          </a>
        ) : (
          "not configured"
        )}{" "}
        · GenLayer StudioNet · the contract holds no funds and enforces nothing off-chain.
      </footer>
    </div>
  );
}
