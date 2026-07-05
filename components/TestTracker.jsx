"use client";

import React, { useState, useEffect, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import taxonomy from "@/data/taxonomy.json";

// ---------- Palette Constants (Slate Dark & Glowing Accents) ----------
const C = {
  ink: "#F8FAFC",       // slate-50
  inkSoft: "#94A3B8",   // slate-400
  paper: "#020617",     // slate-950
  card: "rgba(15, 23, 42, 0.4)", // slate-900 with opacity
  line: "#1E293B",      // slate-800
  green: "#10B981",     // emerald-500
  greenBg: "rgba(16, 185, 129, 0.12)",
  red: "#EF4444",       // red-500
  redBg: "rgba(239, 68, 68, 0.12)",
  amber: "#F59E0B",     // amber-500
  amberBg: "rgba(245, 158, 11, 0.12)",
  blue: "#3B82F6",      // blue-500
};

const SUBJECTS = ["Physics", "Chemistry", "Maths"];
const SUBJ_COLOR = { Physics: "#3B82F6", Chemistry: "#10B981", Maths: "#EF4444" };
const RESULT_LABEL = { C: "Correct", W: "Wrong", U: "Unattempted" };

// ---------- Paper 1 seed (used if database is empty) ----------
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

// ---------- UI atoms ----------
const Card = ({ children, className = "", style }) => (
  <div className={`backdrop-blur-md bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 hover:border-slate-700/80 transition-all duration-300 shadow-xl shadow-slate-950/20 ${className}`} style={style}>
    {children}
  </div>
);

const Label = ({ children }) => (
  <div className="text-xs tracking-wider uppercase text-slate-400 font-semibold mb-2">{children}</div>
);

const Big = ({ children, color, className = "" }) => (
  <div className={`text-3xl font-bold tracking-tight font-sans ${className}`} style={{ color: color || C.ink }}>
    {children}
  </div>
);

function Bar({ pct, color }) {
  return (
    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/30">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.round(pct * 100)}%`, backgroundColor: color }} />
    </div>
  );
}

// Custom Tooltip component for Recharts
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-md rounded-xl p-3 shadow-2xl text-xs">
        <p className="font-bold text-slate-200 mb-2">{payload[0].payload.full}</p>
        <div className="flex flex-col gap-1.5">
          {payload.map((p) => (
            <div key={p.name} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: p.stroke || p.color }} />
                {p.name}:
              </span>
              <span className="font-bold text-slate-100">{p.value} marks</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

// OMR-style question grid
function OMRGrid({ questions, onFlip }) {
  return (
    <div className="flex flex-col gap-6 md:flex-row md:justify-between">
      {SUBJECTS.map((s) => {
        const qs = questions.filter((q) => q.subject === s);
        if (!qs.length) return null;
        return (
          <div key={s} className="flex-1 bg-slate-900/20 border border-slate-800/40 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800/60">
              <span className="text-sm font-bold tracking-wide" style={{ color: SUBJ_COLOR[s] }}>{s}</span>
              <span className="text-xs text-slate-400">{qs.length} Qs</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {qs.map((q) => {
                const normQ = normalizeQuestion(q);
                const isCorrect = normQ.result === "C";
                const isWrong = normQ.result === "W";
                const bg = isCorrect ? C.greenBg : isWrong ? C.redBg : "rgba(30, 41, 59, 0.4)";
                const bd = isCorrect ? C.green : isWrong ? C.red : "#334155";
                const fg = isCorrect ? C.green : isWrong ? C.red : "#94a3b8";
                const titleText = `Q${normQ.q} · ${normQ.chapter}${normQ.subtopic && normQ.subtopic !== normQ.chapter ? ` > ${normQ.subtopic}` : ""} · ${RESULT_LABEL[normQ.result]}${onFlip ? " — click to cycle" : ""}`;
                return (
                  <button key={normQ.q} title={titleText}
                    onClick={() => onFlip && onFlip(normQ.q)}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold border-1.5 transition-all duration-200 hover:scale-110 active:scale-95"
                    style={{ background: bg, borderColor: bd, color: fg, cursor: onFlip ? "pointer" : "default" }}>
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

  if (!loaded) return <div className="bg-slate-950 min-h-screen grid place-items-center text-slate-400 font-sans">Loading saved tests…</div>;

  const current = view.startsWith("test:") ? tests.find((t) => t.id === view.slice(5)) : null;

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 pb-12">
      {/* header */}
      <div className="sticky top-0 z-50 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-900/30">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-lg tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>TestTracker</div>
              <div className="text-[11px] text-slate-400 font-medium">JEE / EAMCET · marking +4 / −1 · {tests.length} test{tests.length === 1 ? "" : "s"}</div>
            </div>
          </div>
          <div className="flex gap-1 bg-slate-900/60 border border-slate-800 p-1 rounded-xl">
            {[["overview", "Overview"], ["upload", "Upload Paper"]].map(([v, l]) => (
              <button key={v} onClick={() => setView(v)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${view === v ? "bg-slate-800 text-slate-50 shadow-sm" : "text-slate-400 hover:text-slate-200"}`}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {err && <div className="bg-red-950/20 border border-red-900/60 text-red-400 rounded-xl p-4 mb-6 text-sm flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />{err}</div>}

        {/* ---------------- UPLOAD ---------------- */}
        {view === "upload" && !draft && (
          <Card className="max-w-2xl mx-auto">
            <Label>Add this week&apos;s paper</Label>
            <p className="text-sm text-slate-400 mb-4 leading-relaxed">
              Upload the scanned, graded PDF. Gemini parses the grader&apos;s +4 / −1 / 0 marks and tags every question by the standard taxonomy. You review and correct before saving.
            </p>
            <div className="border-2 border-dashed border-slate-800 rounded-xl p-8 hover:border-indigo-500/50 hover:bg-indigo-950/5 transition-all duration-300 text-center cursor-pointer relative">
              <input type="file" accept="application/pdf" disabled={busy}
                onChange={(e) => e.target.files[0] && extractPdf(e.target.files[0])}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
              <div className="flex flex-col items-center justify-center gap-2.5">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <div className="text-sm font-semibold text-slate-300">Click or drag PDF here to upload</div>
                <div className="text-xs text-slate-500">Up to 30 MB · Graded JEE/EAMCET test paper</div>
              </div>
            </div>
            {busy && (
              <div className="mt-4 p-3 bg-indigo-950/10 border border-indigo-900/30 rounded-xl text-xs text-indigo-400 flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                Reading and classifying PDF... this can take 20–40 seconds for a full paper.
              </div>
            )}
            {tests.length === 0 && (
              <div className="mt-6 pt-5 border-t border-slate-900 flex justify-center">
                <button onClick={() => saveTest(SEED, false)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold transition-all shadow-md shadow-indigo-900/20 active:scale-95">
                  Load Seed Paper (LJ CT02)
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
              <div className="flex flex-wrap gap-4 items-end mt-2">
                <div className="flex-1 min-w-[280px]">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Test Name</div>
                  <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Date</div>
                  <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                    className="bg-slate-900/60 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors" />
                </div>
              </div>
              {draft.partial && <div className="mt-3 text-xs text-amber-500 bg-amber-950/15 border border-amber-900/40 p-2.5 rounded-lg">Some questions couldn&apos;t be read from the scan and were set to Unattempted — click bubbles below to fix.</div>}
              <p className="text-[11px] text-slate-400 mt-3">
                Click any bubble to cycle Correct → Wrong → Unattempted. Verify against the markings on the scanned paper.
              </p>
            </Card>
            <Card><OMRGrid questions={draft.questions} onFlip={flipDraft} /></Card>
            
            <Card className="max-h-[300px] overflow-y-auto">
              <Label>Classification Preview</Label>
              <p className="text-[11px] text-slate-400 mb-4">Verify how each question was classified before saving.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {SUBJECTS.map((s) => {
                  const qs = draft.questions.filter((q) => q.subject === s);
                  return (
                    <div key={s} className="border border-slate-850 rounded-xl p-3 bg-slate-900/20">
                      <div className="text-xs font-bold mb-2 pb-1 border-b border-slate-800" style={{ color: SUBJ_COLOR[s] }}>{s}</div>
                      <div className="max-h-[160px] overflow-y-auto pr-1">
                        {qs.map((q) => {
                          const normQ = normalizeQuestion(q);
                          return (
                            <div key={normQ.q} className="text-[11px] flex justify-between py-1 border-b border-dashed border-slate-850">
                              <span className="font-semibold text-slate-400">Q{normQ.q}:</span>
                              <span className="text-right text-slate-200 pl-2 truncate" title={`${normQ.chapter} > ${normQ.subtopic}`}>
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
                  <button onClick={() => setDraft(null)} className="px-4 py-2 border border-slate-700 hover:bg-slate-800 rounded-lg text-xs font-bold transition-all cursor-pointer">Discard</button>
                  <button onClick={saveDraft} className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-emerald-950/20 cursor-pointer">Save test</button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ---------------- OVERVIEW ---------------- */}
        {view === "overview" && (
          tests.length === 0 ? (
            <Card className="text-center py-16 max-w-xl mx-auto">
              <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div className="text-base font-bold text-slate-200">No tests loaded yet</div>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mt-2 mb-6 leading-relaxed">Upload a scanned weekend paper to automatically parse, classify, and track your progress.</p>
              <button onClick={() => setView("upload")} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-indigo-950/40 cursor-pointer">Upload Paper</button>
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
                    <Card><Label>Latest total</Label><Big>{st.marks} <span className="text-xs text-slate-500 font-medium">/ 300</span></Big>
                      {delta !== null && <div className={`text-xs font-semibold mt-1 flex items-center gap-1 ${delta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{delta >= 0 ? "▲" : "▼"}{Math.abs(delta)} vs last week</div>}</Card>
                    <Card><Label>Attempt rate</Label><Big>{Math.round(st.attPct * 100)}%</Big><div className="text-[11px] text-slate-400 mt-1">{st.u} left blank</div></Card>
                    <Card><Label>Accuracy</Label><Big>{st.acc === null ? "—" : Math.round(st.acc * 100) + "%"}</Big><div className="text-[11px] text-slate-400 mt-1">{st.c} right · {st.w} wrong</div></Card>
                    <Card><Label>Negatives lost</Label><Big color={C.red}>−{st.w}</Big><div className="text-[11px] text-slate-400 mt-1">latest test</div></Card>
                  </>);
                })()}
              </div>

              {/* trend */}
              {tests.length >= 2 && (
                <Card>
                  <Label>Marks trend</Label>
                  <div className="h-64 mt-3">
                    <ResponsiveContainer>
                      <AreaChart data={trend} margin={{ top: 10, right: 20, bottom: 0, left: -25 }}>
                        <defs>
                          <linearGradient id="colorPhysics" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={SUBJ_COLOR.Physics} stopOpacity={0.2}/>
                            <stop offset="95%" stopColor={SUBJ_COLOR.Physics} stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorChemistry" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={SUBJ_COLOR.Chemistry} stopOpacity={0.2}/>
                            <stop offset="95%" stopColor={SUBJ_COLOR.Chemistry} stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorMaths" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={SUBJ_COLOR.Maths} stopOpacity={0.2}/>
                            <stop offset="95%" stopColor={SUBJ_COLOR.Maths} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                        <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend iconType="circle" />
                        <Area type="monotone" name="Physics" dataKey="Physics" stroke={SUBJ_COLOR.Physics} fillOpacity={1} fill="url(#colorPhysics)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                        <Area type="monotone" name="Chemistry" dataKey="Chemistry" stroke={SUBJ_COLOR.Chemistry} fillOpacity={1} fill="url(#colorChemistry)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                        <Area type="monotone" name="Maths" dataKey="Maths" stroke={SUBJ_COLOR.Maths} fillOpacity={1} fill="url(#colorMaths)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              )}

              {/* weak chapters across all tests */}
              <Card>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Label>Chapter report — weakest first (all tests)</Label>
                  <div className="flex gap-1 bg-slate-950/40 p-0.5 border border-slate-800 rounded-lg">
                    {[null, ...SUBJECTS].map((s) => (
                      <button key={s || "all"} onClick={() => setSubjFilter(s)}
                        className={`px-3 py-1 rounded text-xs font-semibold transition-all ${subjFilter === s ? "bg-slate-800 text-slate-100" : "text-slate-400 hover:text-slate-200"}`}>
                        {s || "All"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm text-slate-300">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                        <th className="py-3 px-4">Chapter</th>
                        <th className="py-3 px-4 text-center">Qs</th>
                        <th className="py-3 px-4">Attempt Rate</th>
                        <th className="py-3 px-4">Accuracy when Attempted</th>
                        <th className="py-3 px-4 text-right">Net Marks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/60">
                      {chapterAgg(tests, subjFilter).map((r) => (
                        <tr key={r.subject + r.chapter} className="hover:bg-slate-900/10 transition-colors">
                          <td className="py-3.5 px-4 font-medium flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SUBJ_COLOR[r.subject] }} />
                            {r.chapter}
                          </td>
                          <td className="py-3.5 px-4 text-center text-slate-400 font-mono">{r.n}</td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <span className="w-10 font-mono text-xs text-slate-400">{Math.round(r.attPct * 100)}%</span>
                              <div className="w-24"><Bar pct={r.attPct} color="#3B82F6" /></div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <span className="w-10 font-mono text-xs text-slate-400">{r.acc === null ? "—" : Math.round(r.acc * 100) + "%"}</span>
                              <div className="w-24"><Bar pct={r.acc || 0} color={r.acc >= 0.7 ? C.green : r.acc >= 0.4 ? C.amber : C.red} /></div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold font-mono" style={{ color: r.c * 4 - r.w >= 0 ? C.ink : C.red }}>
                            {r.c * 4 - r.w > 0 ? `+${r.c * 4 - r.w}` : r.c * 4 - r.w}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* test list */}
              <Card>
                <Label>Tests</Label>
                <div className="flex flex-col gap-3 mt-2">
                  {tests.map((t, i) => {
                    const st = subjectStats(t.questions);
                    return (
                      <div key={t.id} className="flex items-center justify-between p-4 bg-slate-900/30 border border-slate-800 rounded-xl hover:border-slate-700/80 transition-all duration-200">
                        <div>
                          <div className="font-semibold text-sm text-slate-200">T{i + 1} · {t.name}</div>
                          <div className="text-xs text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
                            <span>{t.date}</span>
                            <span className="text-slate-700">•</span>
                            <span className="text-indigo-400 font-semibold">{st.marks}/300 marks</span>
                            <span className="text-slate-700">•</span>
                            <div className="flex gap-2">
                              {SUBJECTS.map((s) => (
                                <span key={s} className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ color: SUBJ_COLOR[s], backgroundColor: `${SUBJ_COLOR[s]}15` }}>
                                  {s[0]}: {subjectStats(t.questions, s).marks}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setView("test:" + t.id)} className="px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800/40 text-xs font-semibold text-slate-200 hover:bg-slate-850 hover:border-slate-650 transition-all cursor-pointer">Open</button>
                          <button onClick={() => { if (confirm("Delete this test?")) removeTest(t.id); }} className="px-3.5 py-1.5 rounded-lg border border-red-900/20 bg-red-950/10 text-xs font-semibold text-red-400 hover:bg-red-950/20 transition-all cursor-pointer">Delete</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )
        )}

        {/* ---------------- SINGLE TEST ---------------- */}
        {current && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <div>
                <div className="font-bold text-xl tracking-tight text-slate-100" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{current.name}</div>
                <div className="text-xs text-slate-400 mt-1 font-medium">{current.date}</div>
              </div>
              <button onClick={() => setView("overview")} className="px-3.5 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-200 font-semibold text-xs transition-all cursor-pointer">← Back to overview</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {SUBJECTS.map((s) => { const st = subjectStats(current.questions, s); return (
                <Card key={s}><Label>{s}</Label><Big color={SUBJ_COLOR[s]}>{st.marks} <span className="text-[11px] text-slate-500 font-medium">/ 100</span></Big>
                  <div className="text-[11px] text-slate-400 mt-1">{st.c} ✓ · {st.w} ✗ · {st.u} blank</div></Card>); })}
              <Card><Label>Total Score</Label><Big>{subjectStats(current.questions).marks} <span className="text-[11px] text-slate-500 font-medium">/ 300</span></Big>
                <div className="text-[11px] text-slate-400 mt-1">{Math.round(subjectStats(current.questions).attPct * 100)}% attempted</div></Card>
            </div>
            <Card>
              <Label>Answer sheet</Label>
              <div className="text-xs text-slate-400 mb-4 font-medium">Green = correct, red = wrong, blank = unattempted. Hover a bubble for its topic hierarchy.</div>
              <OMRGrid questions={current.questions} />
            </Card>
            <Card>
              <Label>Chapter breakdown — this test, weakest first</Label>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm text-slate-300">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                      <th className="py-2.5 px-4">Chapter</th>
                      <th className="py-2.5 px-4">Breakdown</th>
                      <th className="py-2.5 px-4">Accuracy</th>
                      <th className="py-2.5 px-4 text-right">Net Marks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60">
                    {chapterAgg([current], null).map((r) => (
                      <tr key={r.subject + r.chapter} className="hover:bg-slate-900/10 transition-colors">
                        <td className="py-3.5 px-4 font-medium flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SUBJ_COLOR[r.subject] }} />
                          {r.chapter}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-450 font-medium font-mono">{r.c}✓ {r.w}✗ {r.u} blank</td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <span className="w-10 font-mono text-xs text-slate-400">{r.acc === null ? "—" : Math.round(r.acc * 100) + "%"}</span>
                            <div className="w-24"><Bar pct={r.acc || 0} color={r.acc >= 0.7 ? C.green : r.acc >= 0.4 ? C.amber : C.red} /></div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold font-mono" style={{ color: r.c * 4 - r.w >= 0 ? C.ink : C.red }}>
                          {r.c * 4 - r.w > 0 ? `+${r.c * 4 - r.w}` : r.c * 4 - r.w}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
