"use client";

import React, { useState, useEffect, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import taxonomy from "@/data/taxonomy.json";

// ---------- palette: ink, answer-sheet paper, red-pen, green-tick ----------
const C = {
  ink: "#1B2A4A",
  inkSoft: "#44506B",
  paper: "#F7F6F1",
  card: "#FFFFFF",
  line: "#E3E1D7",
  green: "#2F855A",
  greenBg: "#E6F4EC",
  red: "#C94F4F",
  redBg: "#FBEAEA",
  amber: "#B7791F",
  amberBg: "#FBF3E2",
  blue: "#3562A6",
};
const SUBJECTS = ["Physics", "Chemistry", "Maths"];
const SUBJ_COLOR = { Physics: "#3562A6", Chemistry: "#2F855A", Maths: "#C94F4F" };
const RESULT_LABEL = { C: "Correct", W: "Wrong", U: "Unattempted" };

// ---------- Paper 1 seed (extracted in chat, verified totals 47/47/21) ----------
const P1 = [
  ["1|Physics|Field & motion of charges|C","2|Physics|Flux & Gauss law|C","3|Physics|Electric dipole|C","4|Physics|Charging & induction|C","5|Physics|Electric dipole|U","6|Physics|Flux & Gauss law|C","7|Physics|Field & motion of charges|U","8|Physics|Flux & Gauss law|W","9|Physics|Coulomb law & forces|C","10|Physics|Coulomb law & forces|C","11|Physics|Flux & Gauss law|U","12|Physics|Charging & induction|C","13|Physics|Flux & Gauss law|U","14|Physics|Field & motion of charges|C","15|Physics|Electric dipole|U","16|Physics|Flux & Gauss law|C","17|Physics|Field & motion of charges|C","18|Physics|Electric dipole|U","19|Physics|Field & motion of charges|U","20|Physics|Flux & Gauss law|C","21|Physics|Field & motion of charges|U","22|Physics|Flux & Gauss law|U","23|Physics|Electric dipole|U","24|Physics|Coulomb law & forces|U","25|Physics|Field & motion of charges|U"],
  ["26|Chemistry|BP elevation|U","27|Chemistry|Henry law|W","28|Chemistry|Raoult law & VP|C","29|Chemistry|Raoult law & VP|U","30|Chemistry|Deviations & azeotropes|U","31|Chemistry|Henry law|C","32|Chemistry|van't Hoff factor|C","33|Chemistry|Concentration terms|U","34|Chemistry|Concentration terms|C","35|Chemistry|Solutions basics|C","36|Chemistry|Raoult law & VP|U","37|Chemistry|Osmosis|C","38|Chemistry|FP depression|C","39|Chemistry|BP elevation|C","40|Chemistry|FP depression|C","41|Chemistry|Henry law|C","42|Chemistry|Deviations & azeotropes|C","43|Chemistry|Raoult law & VP|U","44|Chemistry|Osmosis|U","45|Chemistry|Concentration terms|C","46|Chemistry|Henry law|U","47|Chemistry|Osmosis|U","48|Chemistry|Raoult law & VP|U","49|Chemistry|Raoult law & VP|U","50|Chemistry|FP depression|U"],
  ["51|Maths|Roots & coefficients|C","52|Maths|Trig-linked quadratics|U","53|Maths|Location of roots|C","54|Maths|Nature of roots|U","55|Maths|Roots & coefficients|C","56|Maths|Inequalities & range|U","57|Maths|Inequalities & range|W","58|Maths|Nature of roots|C","59|Maths|Reducible to quadratic|U","60|Maths|Roots & coefficients|C","61|Maths|Roots & coefficients|C","62|Maths|Common roots|U","63|Maths|Inequalities & range|U","64|Maths|Reducible to quadratic|U","65|Maths|Inequalities & range|U","66|Maths|Common roots|U","67|Maths|Trig-linked quadratics|U","68|Maths|Nature of roots|W","69|Maths|Location of roots|U","70|Maths|Nature of roots|W","71|Maths|Inequalities & range|U","72|Maths|Roots & coefficients|U","73|Maths|Roots & coefficients|U","74|Maths|Inequalities & range|U","75|Maths|Roots & coefficients|U"],
].flat().map((s) => { const [q, subject, topic, result] = s.split("|"); return { q: +q, subject, topic, result }; });

const SEED = { name: "LJ CT02 — Electrostatics / Solutions / Quadratics", date: "2026-06-15", questions: P1 };

// ---------- helpers ----------
function normalizeQuestion(q) {
  if (!q) return q;
  if (q.chapter && q.subtopic) return q;

  const topic = q.topic || "Other";
  let foundChapter = "Other";
  let foundSubtopic = topic;

  const subject = q.subject || "Physics";
  const subjTaxonomy = taxonomy[subject];

  if (subjTaxonomy) {
    outerLoop:
    for (const [chap, subtopics] of Object.entries(subjTaxonomy)) {
      if (subtopics.some((s) => s.toLowerCase() === topic.toLowerCase() || topic.toLowerCase().includes(s.toLowerCase()))) {
        foundChapter = chap;
        foundSubtopic = subtopics.find((s) => s.toLowerCase() === topic.toLowerCase() || topic.toLowerCase().includes(s.toLowerCase())) || topic;
        break outerLoop;
      }
      if (chap.toLowerCase() === topic.toLowerCase() || topic.toLowerCase().includes(chap.toLowerCase())) {
        foundChapter = chap;
        foundSubtopic = subtopics[0] || "General";
        break outerLoop;
      }
    }
  }

  return {
    ...q,
    chapter: foundChapter,
    subtopic: foundSubtopic,
  };
}

function subjectStats(questions, subject) {
  const normalizedQs = questions.map(normalizeQuestion);
  const qs = subject ? normalizedQs.filter((x) => x.subject === subject) : normalizedQs;
  const c = qs.filter((x) => x.result === "C").length;
  const w = qs.filter((x) => x.result === "W").length;
  const u = qs.filter((x) => x.result === "U").length;
  const att = qs.length - u;
  return { total: qs.length, c, w, u, att, marks: c * 4 - w, attPct: qs.length ? att / qs.length : 0, acc: att ? c / att : null };
}

function chapterAgg(tests, subject) {
  const map = {};
  tests.forEach((t) => t.questions.forEach((qRaw) => {
    const q = normalizeQuestion(qRaw);
    if (subject && q.subject !== subject) return;
    const key = q.subject + "::" + q.chapter;
    map[key] = map[key] || { subject: q.subject, chapter: q.chapter, c: 0, w: 0, u: 0, n: 0 };
    map[key].n++;
    map[key][q.result.toLowerCase()]++;
  }));
  return Object.values(map).map((r) => ({
    ...r, att: r.n - r.u, attPct: (r.n - r.u) / r.n,
    acc: r.n - r.u ? r.c / (r.n - r.u) : null,
    score: (r.n - r.u ? r.c / (r.n - r.u) : 0) * 0.6 + ((r.n - r.u) / r.n) * 0.4,
  })).sort((a, b) => a.score - b.score);
}

// ---------- tiny UI atoms ----------
const Card = ({ children, style }) => (
  <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, padding: 16, ...style }}>{children}</div>
);
const Label = ({ children }) => (
  <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: C.inkSoft, fontWeight: 600, marginBottom: 4 }}>{children}</div>
);
const Big = ({ children, color }) => (
  <div style={{ fontSize: 28, fontWeight: 700, color: color || C.ink, fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>{children}</div>
);

function Bar({ pct, color }) {
  return (
    <div style={{ height: 8, background: C.paper, borderRadius: 4, overflow: "hidden", border: `1px solid ${C.line}` }}>
      <div style={{ width: `${Math.round(pct * 100)}%`, height: "100%", background: color }} />
    </div>
  );
}

// OMR-style question grid — the signature element
function OMRGrid({ questions, onFlip }) {
  return (
    <div className="flex flex-wrap gap-6">
      {SUBJECTS.map((s) => {
        const qs = questions.filter((q) => q.subject === s);
        if (!qs.length) return null;
        return (
          <div key={s}>
            <Label>{s}</Label>
            <div className="grid grid-cols-5 gap-1">
              {qs.map((q) => {
                const normQ = normalizeQuestion(q);
                const bg = normQ.result === "C" ? C.greenBg : normQ.result === "W" ? C.redBg : C.paper;
                const bd = normQ.result === "C" ? C.green : normQ.result === "W" ? C.red : C.line;
                const fg = normQ.result === "C" ? C.green : normQ.result === "W" ? C.red : C.inkSoft;
                const titleText = `Q${normQ.q} · ${normQ.chapter}${normQ.subtopic && normQ.subtopic !== normQ.chapter ? ` > ${normQ.subtopic}` : ""} · ${RESULT_LABEL[normQ.result]}${onFlip ? " — click to cycle" : ""}`;
                return (
                  <button key={normQ.q} title={titleText}
                    onClick={() => onFlip && onFlip(normQ.q)}
                    style={{ width: 34, height: 34, borderRadius: "50%", background: bg, border: `1.5px solid ${bd}`, color: fg, fontSize: 11, fontWeight: 600, cursor: onFlip ? "pointer" : "default" }}>
                    {normQ.q}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- main app ----------
export default function TestTracker() {
  const [tests, setTests] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("overview"); // overview | upload | test:<id>
  const [subjFilter, setSubjFilter] = useState(null);

  // upload flow state
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [draft, setDraft] = useState(null); // {name, date, questions, partial}

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/tests");
        const data = await r.json();
        if (r.ok) setTests(data.tests || []);
        else setErr(data.error || "Could not load saved tests.");
      } catch (e) {
        setErr("Could not load saved tests. Is the server running?");
      }
      setLoaded(true);
    })();
  }, []);

  async function extractPdf(file) {
    setBusy(true); setErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const resp = await fetch("/api/extract", { method: "POST", body: fd });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "API error");
      setDraft(data);
    } catch (e) {
      setErr(`Extraction failed: ${e.message}. You can retry, or check the PDF is a clear scan under ~30 MB.`);
    }
    setBusy(false);
  }

  function flipDraft(qno) {
    setDraft((d) => ({ ...d, questions: d.questions.map((q) => q.q === qno ? { ...q, result: q.result === "C" ? "W" : q.result === "W" ? "U" : "C" } : q) }));
  }

  async function saveTest(payload, openAfter) {
    setErr("");
    try {
      const resp = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const t = await resp.json();
      if (!resp.ok) throw new Error(t.error || "Could not save");
      setTests((prev) => [...prev, t].sort((a, b) => (a.date > b.date ? 1 : -1)));
      if (openAfter) setView("test:" + t.id);
      return true;
    } catch (e) {
      setErr(`Could not save the test: ${e.message}`);
      return false;
    }
  }

  async function saveDraft() {
    const ok = await saveTest({
      name: draft.name,
      date: draft.date || new Date().toISOString().slice(0, 10),
      questions: draft.questions,
    }, true);
    if (ok) setDraft(null);
  }

  async function removeTest(id) {
    setErr("");
    try {
      const resp = await fetch(`/api/tests/${id}`, { method: "DELETE" });
      if (!resp.ok && resp.status !== 404) throw new Error("Server error");
      setTests((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      setErr("Could not delete the test. Try again.");
    }
  }

  const trend = useMemo(() => tests.map((t, i) => {
    const row = { name: `T${i + 1}`, full: t.name, Total: subjectStats(t.questions).marks };
    SUBJECTS.forEach((s) => (row[s] = subjectStats(t.questions, s).marks));
    return row;
  }), [tests]);

  if (!loaded) return <div style={{ background: C.paper, minHeight: "100vh", display: "grid", placeItems: "center", color: C.inkSoft }}>Loading saved tests…</div>;

  const current = view.startsWith("test:") ? tests.find((t) => t.id === view.slice(5)) : null;

  return (
    <div style={{ background: C.paper, minHeight: "100vh", color: C.ink, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* header */}
      <div style={{ borderBottom: `2px solid ${C.ink}`, background: C.card }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 20 }}>Weekend Test Tracker</div>
            <div style={{ fontSize: 12, color: C.inkSoft }}>JEE / EAMCET · marking +4 / −1 · {tests.length} test{tests.length === 1 ? "" : "s"} recorded</div>
          </div>
          <div className="flex gap-2">
            {[["overview", "Overview"], ["upload", "Upload paper"]].map(([v, l]) => (
              <button key={v} onClick={() => setView(v)}
                style={{ padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  background: view === v ? C.ink : "transparent", color: view === v ? "#fff" : C.ink, border: `1.5px solid ${C.ink}` }}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {err && <div style={{ background: C.redBg, border: `1px solid ${C.red}`, color: C.red, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13 }}>{err}</div>}

        {/* ---------------- UPLOAD ---------------- */}
        {view === "upload" && !draft && (
          <Card>
            <Label>Add this week&apos;s paper</Label>
            <p style={{ fontSize: 14, color: C.inkSoft, margin: "4px 0 14px" }}>
              Upload the scanned, graded PDF. Claude reads the grader&apos;s +4 / −1 / 0 marks and tags every question by topic. You review and correct before saving — nothing is stored until you confirm.
            </p>
            <input type="file" accept="application/pdf" disabled={busy}
              onChange={(e) => e.target.files[0] && extractPdf(e.target.files[0])}
              style={{ fontSize: 14 }} />
            {busy && <div style={{ marginTop: 14, fontSize: 14, color: C.blue }}>Reading the scan… this takes 20–60 seconds for a 7-page paper.</div>}
            {tests.length === 0 && (
              <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px dashed ${C.line}` }}>
                <button onClick={() => saveTest(SEED, false)}
                  style={{ padding: "8px 14px", borderRadius: 8, background: C.blue, color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Load Paper 1 (already analysed in chat)
                </button>
              </div>
            )}
          </Card>
        )}

        {/* ---------------- REVIEW DRAFT ---------------- */}
        {view === "upload" && draft && (
          <div className="flex flex-col gap-4">
            <Card>
              <Label>Review before saving</Label>
              <div className="flex flex-wrap gap-3 items-end" style={{ marginTop: 6 }}>
                <div><div style={{ fontSize: 12, color: C.inkSoft }}>Test name</div>
                  <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    style={{ border: `1px solid ${C.line}`, borderRadius: 6, padding: "6px 10px", fontSize: 14, width: 320 }} /></div>
                <div><div style={{ fontSize: 12, color: C.inkSoft }}>Date</div>
                  <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                    style={{ border: `1px solid ${C.line}`, borderRadius: 6, padding: "6px 10px", fontSize: 14 }} /></div>
              </div>
              {draft.partial && <div style={{ marginTop: 10, fontSize: 13, color: C.amber }}>Some questions couldn&apos;t be read from the scan and were set to Unattempted — click bubbles below to fix.</div>}
              <p style={{ fontSize: 13, color: C.inkSoft, marginTop: 10 }}>
                Click any bubble to cycle Correct → Wrong → Unattempted. Compare against the marks on the paper.
              </p>
            </Card>
            <Card><OMRGrid questions={draft.questions} onFlip={flipDraft} /></Card>
            <Card style={{ maxHeight: 300, overflowY: "auto" }}>
              <Label>Classification Preview</Label>
              <p style={{ fontSize: 12, color: C.inkSoft, marginBottom: 8 }}>Verify how each question was classified before saving.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {SUBJECTS.map((s) => {
                  const qs = draft.questions.filter((q) => q.subject === s);
                  return (
                    <div key={s} style={{ border: `1px solid ${C.line}`, borderRadius: 6, padding: 8, background: C.paper }}>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: SUBJ_COLOR[s], borderBottom: `1px solid ${C.line}`, paddingBottom: 4 }}>{s}</div>
                      <div style={{ maxHeight: 180, overflowY: "auto", paddingRight: 4 }}>
                        {qs.map((q) => {
                          const normQ = normalizeQuestion(q);
                          return (
                            <div key={normQ.q} style={{ fontSize: 11, display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: `1px dashed ${C.line}` }}>
                              <span style={{ fontWeight: 600 }}>Q{normQ.q}:</span>
                              <span style={{ textAlign: "right", color: C.inkSoft }}>
                                {normQ.chapter} &gt; {normQ.subtopic}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
            <Card>
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex gap-6">
                  {SUBJECTS.map((s) => { const st = subjectStats(draft.questions, s); return (
                    <div key={s}><Label>{s}</Label><Big color={SUBJ_COLOR[s]}>{st.marks}</Big></div>); })}
                  <div><Label>Total</Label><Big>{subjectStats(draft.questions).marks} / 300</Big></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setDraft(null)} style={{ padding: "10px 16px", borderRadius: 8, border: `1.5px solid ${C.ink}`, background: "transparent", fontWeight: 600, cursor: "pointer" }}>Discard</button>
                  <button onClick={saveDraft} style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: C.green, color: "#fff", fontWeight: 600, cursor: "pointer" }}>Save test</button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ---------------- OVERVIEW ---------------- */}
        {view === "overview" && (
          tests.length === 0 ? (
            <Card style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700 }}>No tests yet</div>
              <p style={{ color: C.inkSoft, fontSize: 14, margin: "8px 0 16px" }}>Upload the first graded paper to start tracking week over week.</p>
              <button onClick={() => setView("upload")} style={{ padding: "10px 18px", borderRadius: 8, background: C.ink, color: "#fff", border: "none", fontWeight: 600, cursor: "pointer" }}>Upload paper</button>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              {/* headline cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(() => {
                  const last = tests[tests.length - 1], prev = tests[tests.length - 2];
                  const st = subjectStats(last.questions), pv = prev && subjectStats(prev.questions);
                  const delta = pv ? st.marks - pv.marks : null;
                  return (<>
                    <Card><Label>Latest total</Label><Big>{st.marks} / 300</Big>
                      {delta !== null && <div style={{ fontSize: 13, fontWeight: 600, color: delta >= 0 ? C.green : C.red }}>{delta >= 0 ? "▲" : "▼"} {Math.abs(delta)} vs last week</div>}</Card>
                    <Card><Label>Attempt rate</Label><Big>{Math.round(st.attPct * 100)}%</Big><div style={{ fontSize: 13, color: C.inkSoft }}>{st.u} left blank</div></Card>
                    <Card><Label>Accuracy (attempted)</Label><Big>{st.acc === null ? "—" : Math.round(st.acc * 100) + "%"}</Big><div style={{ fontSize: 13, color: C.inkSoft }}>{st.c} right · {st.w} wrong</div></Card>
                    <Card><Label>Negative marks lost</Label><Big color={C.red}>−{st.w}</Big><div style={{ fontSize: 13, color: C.inkSoft }}>latest test</div></Card>
                  </>);
                })()}
              </div>

              {/* trend */}
              {tests.length >= 2 && (
                <Card>
                  <Label>Marks trend</Label>
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer>
                      <LineChart data={trend} margin={{ top: 10, right: 20, bottom: 0, left: -20 }}>
                        <CartesianGrid stroke={C.line} strokeDasharray="3 3" />
                        <XAxis dataKey="name" stroke={C.inkSoft} fontSize={12} />
                        <YAxis stroke={C.inkSoft} fontSize={12} />
                        <Tooltip labelFormatter={(l, p) => p && p[0] ? p[0].payload.full : l} />
                        <Legend />
                        {SUBJECTS.map((s) => <Line key={s} dataKey={s} stroke={SUBJ_COLOR[s]} strokeWidth={2} dot />)}
                        <Line dataKey="Total" stroke={C.ink} strokeWidth={2.5} strokeDasharray="6 3" dot />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              )}

              {/* weak topics across all tests */}
              <Card>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Label>Chapter report — weakest first (all tests)</Label>
                  <div className="flex gap-1">
                    {[null, ...SUBJECTS].map((s) => (
                      <button key={s || "all"} onClick={() => setSubjFilter(s)}
                        style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                          border: `1px solid ${C.line}`, background: subjFilter === s ? C.ink : "transparent", color: subjFilter === s ? "#fff" : C.inkSoft }}>
                        {s || "All"}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ marginTop: 10 }}>
                  <div className="grid grid-cols-12 gap-2" style={{ fontSize: 11, color: C.inkSoft, fontWeight: 600, padding: "4px 0", borderBottom: `1px solid ${C.line}` }}>
                    <div className="col-span-4">Chapter</div><div className="col-span-1">Qs</div>
                    <div className="col-span-3">Attempt rate</div><div className="col-span-3">Accuracy when attempted</div><div className="col-span-1">Marks</div>
                  </div>
                  {chapterAgg(tests, subjFilter).map((r) => (
                    <div key={r.subject + r.chapter} className="grid grid-cols-12 gap-2 items-center" style={{ padding: "7px 0", borderBottom: `1px solid ${C.line}`, fontSize: 13 }}>
                      <div className="col-span-4"><span style={{ color: SUBJ_COLOR[r.subject], fontWeight: 700 }}>●</span> {r.chapter}</div>
                      <div className="col-span-1">{r.n}</div>
                      <div className="col-span-3 flex items-center gap-2"><div style={{ flex: 1 }}><Bar pct={r.attPct} color={C.blue} /></div><span style={{ width: 34, fontSize: 12 }}>{Math.round(r.attPct * 100)}%</span></div>
                      <div className="col-span-3 flex items-center gap-2"><div style={{ flex: 1 }}><Bar pct={r.acc || 0} color={r.acc >= 0.7 ? C.green : r.acc >= 0.4 ? C.amber : C.red} /></div><span style={{ width: 34, fontSize: 12 }}>{r.acc === null ? "—" : Math.round(r.acc * 100) + "%"}</span></div>
                      <div className="col-span-1" style={{ fontWeight: 600, color: r.c * 4 - r.w > 0 ? C.ink : C.red }}>{r.c * 4 - r.w}</div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* test list */}
              <Card>
                <Label>Tests</Label>
                {tests.map((t, i) => { const st = subjectStats(t.questions); return (
                  <div key={t.id} className="flex items-center justify-between flex-wrap gap-2" style={{ padding: "10px 0", borderBottom: `1px solid ${C.line}` }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>T{i + 1} · {t.name}</div>
                      <div style={{ fontSize: 12, color: C.inkSoft }}>{t.date} · {st.marks}/300 · {SUBJECTS.map((s) => `${s[0]} ${subjectStats(t.questions, s).marks}`).join(" · ")}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setView("test:" + t.id)} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.ink}`, background: "transparent", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Open</button>
                      <button onClick={() => { if (confirm("Delete this test?")) removeTest(t.id); }}
                        style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.red}`, color: C.red, background: "transparent", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Delete</button>
                    </div>
                  </div>); })}
              </Card>
            </div>
          )
        )}

        {/* ---------------- SINGLE TEST ---------------- */}
        {current && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18 }}>{current.name}</div>
                <div style={{ fontSize: 13, color: C.inkSoft }}>{current.date}</div>
              </div>
              <button onClick={() => setView("overview")} style={{ padding: "8px 14px", borderRadius: 8, border: `1.5px solid ${C.ink}`, background: "transparent", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>← Back to overview</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {SUBJECTS.map((s) => { const st = subjectStats(current.questions, s); return (
                <Card key={s}><Label>{s}</Label><Big color={SUBJ_COLOR[s]}>{st.marks} / 100</Big>
                  <div style={{ fontSize: 12, color: C.inkSoft }}>{st.c} ✓ · {st.w} ✗ · {st.u} blank</div></Card>); })}
              <Card><Label>Total</Label><Big>{subjectStats(current.questions).marks} / 300</Big>
                <div style={{ fontSize: 12, color: C.inkSoft }}>{Math.round(subjectStats(current.questions).attPct * 100)}% attempted</div></Card>
            </div>
            <Card>
              <Label>Answer sheet</Label>
              <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 10 }}>Green = correct, red = wrong, blank = unattempted. Hover a bubble for its topic.</div>
              <OMRGrid questions={current.questions} />
            </Card>
            <Card>
              <Label>Chapter breakdown — this test, weakest first</Label>
              <div style={{ marginTop: 8 }}>
                {chapterAgg([current], null).map((r) => (
                  <div key={r.subject + r.chapter} className="grid grid-cols-12 gap-2 items-center" style={{ padding: "6px 0", borderBottom: `1px solid ${C.line}`, fontSize: 13 }}>
                    <div className="col-span-5"><span style={{ color: SUBJ_COLOR[r.subject], fontWeight: 700 }}>●</span> {r.chapter}</div>
                    <div className="col-span-2" style={{ fontSize: 12, color: C.inkSoft }}>{r.c}✓ {r.w}✗ {r.u} blank</div>
                    <div className="col-span-4"><Bar pct={r.acc || 0} color={r.acc >= 0.7 ? C.green : r.acc >= 0.4 ? C.amber : C.red} /></div>
                    <div className="col-span-1" style={{ fontWeight: 600 }}>{r.c * 4 - r.w}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
