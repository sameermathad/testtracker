"use client";

import React, { useState, useEffect, useMemo } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import taxonomy from "@/data/taxonomy.json";

// ---------- Palette Constants (Bright Theme) ----------
const C = {
  ink: "#0F172A",       // slate-900
  inkSoft: "#475569",   // slate-600
  paper: "#F8FAFC",     // slate-50
  card: "#FFFFFF",      // white
  line: "#E2E8F0",      // slate-200
  green: "#10B981",     // emerald-500
  greenBg: "rgba(16, 185, 129, 0.08)",
  red: "#EF4444",       // red-500
  redBg: "rgba(239, 68, 68, 0.08)",
  amber: "#F59E0B",     // amber-500
  amberBg: "rgba(245, 158, 11, 0.08)",
  blue: "#3B82F6",      // blue-500
  blueBg: "rgba(59, 130, 246, 0.08)",
};

const SUBJECTS = ["Physics", "Chemistry", "Maths"];
const SUBJ_COLOR = { Physics: "#3B82F6", Chemistry: "#10B981", Maths: "#EF4444" };
const RESULT_LABEL = { C: "Correct", W: "Wrong", U: "Unattempted" };

// Standard Chapter weightings for JEE & EAMCET
const WEIGHTS = {
  Physics: {
    "Units, Dimensions & Errors": { jee: "Low", eamcet: "Medium" },
    "Kinematics": { jee: "Medium", eamcet: "High" },
    "Laws of Motion": { jee: "Medium", eamcet: "High" },
    "Work, Energy & Power": { jee: "Medium", eamcet: "Medium" },
    "Rotational Motion": { jee: "High", eamcet: "High" },
    "Gravitation": { jee: "Medium", eamcet: "Medium" },
    "Properties of Matter": { jee: "Low", eamcet: "Medium" },
    "Thermal Physics": { jee: "High", eamcet: "High" },
    "Oscillations & Waves": { jee: "High", eamcet: "High" },
    "Electrostatics": { jee: "High", eamcet: "High" },
    "Current Electricity": { jee: "High", eamcet: "High" },
    "Magnetism": { jee: "Medium", eamcet: "Medium" },
    "EMI & AC": { jee: "High", eamcet: "Medium" },
    "Optics": { jee: "High", eamcet: "High" },
    "Modern Physics": { jee: "High", eamcet: "High" },
    "Semiconductors & Communication": { jee: "Medium", eamcet: "Medium" }
  },
  Chemistry: {
    "Mole Concept & Stoichiometry": { jee: "Medium", eamcet: "Medium" },
    "Atomic Structure": { jee: "Medium", eamcet: "Medium" },
    "Periodic Table & Periodicity": { jee: "Low", eamcet: "Medium" },
    "Chemical Bonding": { jee: "High", eamcet: "High" },
    "States of Matter": { jee: "Low", eamcet: "Medium" },
    "Thermodynamics & Thermochemistry": { jee: "High", eamcet: "Medium" },
    "Equilibrium": { jee: "High", eamcet: "High" },
    "Redox & Electrochemistry": { jee: "High", eamcet: "High" },
    "Solutions & Colligative Properties": { jee: "Medium", eamcet: "High" },
    "Chemical Kinetics": { jee: "High", eamcet: "Medium" },
    "Surface Chemistry": { jee: "Low", eamcet: "Low" },
    "Hydrogen & s-Block": { jee: "Low", eamcet: "Medium" },
    "p-Block Elements": { jee: "High", eamcet: "High" },
    "d & f-Block Elements": { jee: "Medium", eamcet: "Medium" },
    "Coordination Compounds": { jee: "High", eamcet: "High" },
    "GOC (General Organic Chemistry)": { jee: "High", eamcet: "High" },
    "Hydrocarbons": { jee: "Medium", eamcet: "High" },
    "Haloalkanes & Haloarenes": { jee: "Medium", eamcet: "Medium" },
    "Alcohols, Phenols & Ethers": { jee: "Medium", eamcet: "High" },
    "Aldehydes, Ketones & Acids": { jee: "High", eamcet: "High" },
    "Amines & N-compounds": { jee: "Medium", eamcet: "Medium" },
    "Biomolecules & Polymers": { jee: "Medium", eamcet: "Medium" },
    "Environmental & Practical Chemistry": { jee: "Low", eamcet: "Low" }
  },
  Maths: {
    "Sets, Relations & Functions": { jee: "Medium", eamcet: "Medium" },
    "Complex Numbers": { jee: "Medium", eamcet: "Medium" },
    "Quadratic Equations": { jee: "Medium", eamcet: "High" },
    "Sequences & Series": { jee: "Medium", eamcet: "High" },
    "Permutations & Combinations": { jee: "Medium", eamcet: "Medium" },
    "Binomial Theorem": { jee: "Medium", eamcet: "Medium" },
    "Matrices & Determinants": { jee: "High", eamcet: "High" },
    "Trigonometry": { jee: "Low", eamcet: "High" },
    "Straight Lines & Pair of Lines": { jee: "Medium", eamcet: "High" },
    "Circles": { jee: "Medium", eamcet: "High" },
    "Conic Sections": { jee: "High", eamcet: "High" },
    "3D Geometry": { jee: "High", eamcet: "Medium" },
    "Vectors": { jee: "High", eamcet: "High" },
    "Limits, Continuity & Differentiability": { jee: "High", eamcet: "High" },
    "Applications of Derivatives": { jee: "High", eamcet: "High" },
    "Integration": { jee: "High", eamcet: "High" },
    "Differential Equations": { jee: "Medium", eamcet: "Medium" },
    "Probability": { jee: "Medium", eamcet: "Medium" },
    "Statistics & Reasoning": { jee: "Medium", eamcet: "Low" }
  }
};

// Seed paper 1
const P1 = [
  ["1|Physics|Field & motion of charges|C","2|Physics|Flux & Gauss law|C","3|Physics|Electric dipole|C","4|Physics|Charging & induction|C","5|Physics|Electric dipole|U","6|Physics|Flux & Gauss law|C","7|Physics|Field & motion of charges|U","8|Physics|Flux & Gauss law|W","9|Physics|Coulomb law & forces|C","10|Physics|Coulomb law & forces|C","11|Physics|Flux & Gauss law|U","12|Physics|Charging & induction|C","13|Physics|Flux & Gauss law|U","14|Physics|Field & motion of charges|C","15|Physics|Electric dipole|U","16|Physics|Flux & Gauss law|C","17|Physics|Field & motion of charges|C","18|Physics|Electric dipole|U","19|Physics|Field & motion of charges|U","20|Physics|Flux & Gauss law|C","21|Physics|Field & motion of charges|U","22|Physics|Flux & Gauss law|U","23|Physics|Electric dipole|U","24|Physics|Coulomb law & forces|U","25|Physics|Field & motion of charges|U"],
  ["26|Chemistry|BP elevation|U","27|Chemistry|Henry law|W","28|Chemistry|Raoult law & VP|C","29|Chemistry|Raoult law & VP|U","30|Chemistry|Deviations & azeotropes|U","31|Chemistry|Henry law|C","32|Chemistry|van't Hoff factor|C","33|Chemistry|Concentration terms|U","34|Chemistry|Concentration terms|C","35|Chemistry|Solutions basics|C","36|Chemistry|Raoult law & VP|U","37|Chemistry|Osmosis|C","38|Chemistry|FP depression|C","39|Chemistry|BP elevation|C","40|Chemistry|FP depression|C","41|Chemistry|Henry law|C","42|Chemistry|Deviations & azeotropes|C","43|Chemistry|Raoult law & VP|U","44|Chemistry|Osmosis|U","45|Chemistry|Concentration terms|C","46|Chemistry|Henry law|U","47|Chemistry|Osmosis|U","48|Chemistry|Raoult law & VP|U","49|Chemistry|Raoult law & VP|U","50|Chemistry|FP depression|U"],
  ["51|Maths|Roots & coefficients|C","52|Maths|Trig-linked quadratics|U","53|Maths|Location of roots|C","54|Maths|Nature of roots|U","55|Maths|Roots & coefficients|C","56|Maths|Inequalities & range|U","57|Maths|Inequalities & range|W","58|Maths|Nature of roots|C","59|Maths|Reducible to quadratic|U","60|Maths|Roots & coefficients|C","61|Maths|Roots & coefficients|C","62|Maths|Common roots|U","63|Maths|Inequalities & range|U","64|Maths|Reducible to quadratic|U","65|Maths|Inequalities & range|U","66|Maths|Common roots|U","67|Maths|Trig-linked quadratics|U","68|Maths|Nature of roots|W","69|Maths|Location of roots|U","70|Maths|Nature of roots|W","71|Maths|Inequalities & range|U","72|Maths|Roots & coefficients|U","73|Maths|Roots & coefficients|U","74|Maths|Inequalities & range|U","75|Maths|Roots & coefficients|U"],
].flat().map((s) => { const [q, subject, topic, result] = s.split("|"); return { q: +q, subject, topic, result, difficulty: q % 3 === 0 ? "Easy" : q % 3 === 1 ? "Medium" : "Hard" }; });

const SEED = { name: "LJ CT02 — Electrostatics / Solutions / Quadratics", date: "2026-06-15", questions: P1 };

// ---------- Helpers ----------
function normalizeQuestion(q) {
  if (!q) return q;
  const difficulty = q.difficulty || "Medium";
  if (q.chapter && q.subtopic) return { ...q, difficulty };

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
    difficulty,
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

// Section logic (Physics: 1-20 MCQ, 21-25 Integer; Chemistry: 26-45 MCQ, 46-50 Integer; Maths: 51-70 MCQ, 71-75 Integer)
function getSectionType(qno) {
  if ((qno >= 1 && qno <= 20) || (qno >= 26 && qno <= 45) || (qno >= 51 && qno <= 70)) {
    return "Single Correct (MCQ)";
  }
  return "Numerical / Integer-Type";
}

function getSectionStats(questions) {
  let mcqTotal = 0, mcqC = 0, mcqW = 0, mcqU = 0;
  let intTotal = 0, intC = 0, intW = 0, intU = 0;
  questions.forEach(qRaw => {
    const q = normalizeQuestion(qRaw);
    const sec = getSectionType(q.q);
    if (sec === "Single Correct (MCQ)") {
      mcqTotal++;
      if (q.result === "C") mcqC++;
      else if (q.result === "W") mcqW++;
      else mcqU++;
    } else {
      intTotal++;
      if (q.result === "C") intC++;
      else if (q.result === "W") intW++;
      else intU++;
    }
  });
  
  const mcqAtt = mcqTotal - mcqU;
  const intAtt = intTotal - intU;
  return {
    mcq: { total: mcqTotal, c: mcqC, w: mcqW, u: mcqU, attRate: mcqTotal ? mcqAtt / mcqTotal : 0, acc: mcqAtt ? mcqC / mcqAtt : 0, marks: mcqC * 4 - mcqW },
    int: { total: intTotal, c: intC, w: intW, u: intU, attRate: intTotal ? intAtt / intTotal : 0, acc: intAtt ? intC / intAtt : 0, marks: intC * 4 - intW }
  };
}

function getDifficultyStats(questions) {
  const map = {
    Easy: { total: 0, c: 0, w: 0, u: 0 },
    Medium: { total: 0, c: 0, w: 0, u: 0 },
    Hard: { total: 0, c: 0, w: 0, u: 0 }
  };
  questions.forEach(qRaw => {
    const q = normalizeQuestion(qRaw);
    const diff = q.difficulty || "Medium";
    if (map[diff]) {
      map[diff].total++;
      if (q.result === "C") map[diff].c++;
      else if (q.result === "W") map[diff].w++;
      else map[diff].u++;
    }
  });
  return Object.keys(map).map(diff => {
    const r = map[diff];
    const att = r.total - r.u;
    return {
      difficulty: diff,
      total: r.total,
      c: r.c,
      w: r.w,
      u: r.u,
      attRate: r.total ? att / r.total : 0,
      acc: att ? r.c / att : 0,
      marks: r.c * 4 - r.w
    };
  });
}

function getSyllabusMap(tests) {
  const map = {};
  Object.entries(taxonomy).forEach(([subject, chapters]) => {
    Object.keys(chapters).forEach((chapter) => {
      if (chapter === "Other") return;
      const key = subject + "::" + chapter;
      map[key] = { subject, chapter, c: 0, w: 0, u: 0, n: 0 };
    });
  });
  
  tests.forEach((t) => {
    t.questions.forEach((qRaw) => {
      const q = normalizeQuestion(qRaw);
      const key = q.subject + "::" + q.chapter;
      if (map[key]) {
        map[key].n++;
        if (q.result === "C") map[key].c++;
        else if (q.result === "W") map[key].w++;
        else map[key].u++;
      }
    });
  });
  
  return Object.values(map).map((r) => {
    const att = r.n - r.u;
    const acc = att ? r.c / att : null;
    let status = "untested";
    if (r.n > 0) {
      if (acc === null || acc < 0.5) status = "weak";
      else if (acc < 0.75) status = "developing";
      else status = "strong";
    }
    return { ...r, att, acc, status };
  });
}

function getRecurringWeakTopics(tests) {
  const map = {};
  tests.forEach((t) => {
    const chapMap = {};
    t.questions.forEach((qRaw) => {
      const q = normalizeQuestion(qRaw);
      const key = q.subject + "::" + q.chapter;
      chapMap[key] = chapMap[key] || { c: 0, w: 0, u: 0 };
      if (q.result === "C") chapMap[key].c++;
      else if (q.result === "W") chapMap[key].w++;
      else chapMap[key].u++;
    });
    
    Object.entries(chapMap).forEach(([key, stats]) => {
      const att = stats.c + stats.w;
      const acc = att ? stats.c / att : 0;
      map[key] = map[key] || { subject: key.split("::")[0], chapter: key.split("::")[1], redCount: 0, appearances: 0 };
      map[key].appearances++;
      if (acc < 0.5) {
        map[key].redCount++;
      }
    });
  });
  
  return Object.values(map).filter(r => r.redCount >= 3);
}

// Custom Markdown text renderer
function renderMarkdown(md) {
  if (!md) return null;
  const lines = md.split("\n");
  return (
    <div className="space-y-2 text-sm text-slate-700 leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("###")) {
          return <h4 key={idx} className="font-bold text-slate-800 text-sm mt-3 mb-1">{trimmed.replace(/^###\s*/, "")}</h4>;
        }
        if (trimmed.startsWith("##")) {
          return <h3 key={idx} className="font-bold text-slate-800 text-base mt-4 mb-2 border-b pb-1">{trimmed.replace(/^##\s*/, "")}</h3>;
        }
        if (trimmed.startsWith("#")) {
          return <h2 key={idx} className="font-bold text-slate-900 text-lg mt-4 mb-2">{trimmed.replace(/^#\s*/, "")}</h2>;
        }
        if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
          const content = trimmed.replace(/^[-*]\s*/, "");
          return (
            <div key={idx} className="flex gap-2 pl-4">
              <span className="text-indigo-500 font-bold">•</span>
              <span>{parseBoldText(content)}</span>
            </div>
          );
        }
        if (trimmed === "") return <div key={idx} className="h-2" />;
        return <p key={idx}>{parseBoldText(trimmed)}</p>;
      })}
    </div>
  );
}

function parseBoldText(text) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) => (i % 2 === 1 ? <strong key={i} className="font-bold text-slate-900">{part}</strong> : part));
}

// ---------- UI atoms ----------
const Card = ({ children, className = "", style }) => (
  <div className={`bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 ${className}`} style={style}>
    {children}
  </div>
);

const Label = ({ children }) => (
  <div className="text-xs tracking-wider uppercase text-slate-500 font-semibold mb-2">{children}</div>
);

const Big = ({ children, color, className = "" }) => (
  <div className={`text-3xl font-bold tracking-tight font-sans ${className}`} style={{ color: color || C.ink }}>
    {children}
  </div>
);

function ProgressBar({ pct, color }) {
  return (
    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.round(pct * 100)}%`, backgroundColor: color }} />
    </div>
  );
}

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xl text-xs">
        <p className="font-bold text-slate-800 mb-2">{payload[0].payload.full}</p>
        <div className="flex flex-col gap-1.5">
          {payload.map((p) => (
            <div key={p.name} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.stroke || p.color }} />
                {p.name}:
              </span>
              <span className="font-bold text-slate-800">{Math.abs(p.value)} marks</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

// OMR-style question grid (Bright mode)
function OMRGrid({ questions, onFlip }) {
  return (
    <div className="flex flex-col gap-6 md:flex-row md:justify-between">
      {SUBJECTS.map((s) => {
        const qs = questions.filter((q) => q.subject === s);
        if (!qs.length) return null;
        return (
          <div key={s} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
              <span className="text-sm font-bold tracking-wide" style={{ color: SUBJ_COLOR[s] }}>{s}</span>
              <span className="text-xs text-slate-500">{qs.length} Qs</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {qs.map((q) => {
                const normQ = normalizeQuestion(q);
                const isCorrect = normQ.result === "C";
                const isWrong = normQ.result === "W";
                const bg = isCorrect ? C.greenBg : isWrong ? C.redBg : "rgba(226, 232, 240, 0.4)";
                const bd = isCorrect ? C.green : isWrong ? C.red : "#cbd5e1";
                const fg = isCorrect ? C.green : isWrong ? C.red : "#64748b";
                const titleText = `Q${normQ.q} · ${normQ.chapter}${normQ.subtopic && normQ.subtopic !== normQ.chapter ? ` > ${normQ.subtopic}` : ""} · Difficulty: ${normQ.difficulty} · ${RESULT_LABEL[normQ.result]}${onFlip ? " — click to cycle" : ""}`;
                return (
                  <button key={normQ.q} title={titleText}
                    onClick={() => onFlip && onFlip(normQ.q)}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold border transition-all duration-200 hover:scale-110 active:scale-95"
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
  const [mapSubjFilter, setMapSubjFilter] = useState("All");

  // upload flow state
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [draft, setDraft] = useState(null);

  // AI Revision Plan state
  const [revisionPlan, setRevisionPlan] = useState("");
  const [generatingPlan, setGeneratingPlan] = useState(false);

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
      setErr(`Extraction failed: ${e.message}. You can retry, or check the PDF is a clear scan.`);
    }
    setBusy(false);
  }

  function flipDraft(qno) {
    setDraft((d) => ({
      ...d,
      questions: d.questions.map((q) => {
        if (q.q !== qno) return q;
        const nextResult = q.result === "C" ? "W" : q.result === "W" ? "U" : "C";
        return { ...q, result: nextResult };
      })
    }));
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

  // AI revision generator trigger
  async function generateRevisionPlan() {
    setGeneratingPlan(true); setErr("");
    try {
      const weakList = chapterAgg(tests, null).slice(0, 5); // Pick top 5 weakest chapters
      const resp = await fetch("/api/revision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weakTopics: weakList.map(r => ({ subject: r.subject, chapter: r.chapter, acc: r.acc, score: r.score })) })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "API error");
      setRevisionPlan(data.plan);
    } catch (e) {
      setErr(`Failed to generate revision plan: ${e.message}`);
    }
    setGeneratingPlan(false);
  }

  // Diagnosis Calculations: Negatives vs Blanks lost trend
  const diagnosticsTrend = useMemo(() => {
    return tests.map((t, i) => {
      const qs = t.questions.map(normalizeQuestion);
      const w = qs.filter((x) => x.result === "W").length;
      const u = qs.filter((x) => x.result === "U").length;
      return {
        name: `T${i + 1}`,
        full: t.name,
        "Blanks (Potential Lost)": u * 4,
        "Negatives (Penalty Lost)": w * 5,
      };
    });
  }, [tests]);

  const trend = useMemo(() => {
    return tests.map((t, i) => {
      const row = { name: `T${i + 1}`, full: t.name };
      SUBJECTS.forEach((s) => {
        row[s] = subjectStats(t.questions, s).marks;
      });
      return row;
    });
  }, [tests]);

  // Overall diagnostic recommendations
  const latestDiagnosis = useMemo(() => {
    if (!tests.length) return null;
    const last = tests[tests.length - 1];
    const qs = last.questions.map(normalizeQuestion);
    const w = qs.filter((x) => x.result === "W").length;
    const u = qs.filter((x) => x.result === "U").length;
    const blanksLost = u * 4;
    const negativesLost = w * 5;

    if (blanksLost === 0 && negativesLost === 0) return { type: "perfect", label: "Excellent test coverage and accuracy!" };
    if (blanksLost > negativesLost) {
      return {
        type: "speed",
        label: "Confidence / Speed Issue",
        desc: "Marks lost to blanks outweigh negative penalty. Focus on time management, practice easy/medium questions to build speed, and avoid getting stuck on hard questions."
      };
    } else {
      return {
        type: "accuracy",
        label: "Knowledge / Accuracy Issue",
        desc: "Negative penalty outweighs blanks lost. The student is guessing too much. Focus on conceptual clarity, double-checking calculations, and leaving highly doubtful questions unattempted."
      };
    }
  }, [tests]);

  // Heatmap Aggregation
  const syllabusMap = useMemo(() => getSyllabusMap(tests), [tests]);

  // Filtered heatmap items
  const filteredSyllabus = useMemo(() => {
    if (mapSubjFilter === "All") return syllabusMap;
    return syllabusMap.filter(x => x.subject === mapSubjFilter);
  }, [syllabusMap, mapSubjFilter]);

  // Recurring weak topics
  const recurringWeak = useMemo(() => getRecurringWeakTopics(tests), [tests]);

  if (!loaded) return <div className="bg-slate-50 min-h-screen grid place-items-center text-slate-500 font-sans">Loading saved tests…</div>;

  const current = view.startsWith("test:") ? tests.find((t) => t.id === view.slice(5)) : null;

  // Latest test section/difficulty analysis helper
  const latestAnalysis = current ? null : tests.length ? (() => {
    const last = tests[tests.length - 1];
    return {
      name: last.name,
      sections: getSectionStats(last.questions),
      difficulty: getDifficultyStats(last.questions),
      droppedEasy: last.questions.map(normalizeQuestion).filter(q => q.difficulty === "Easy" && q.result !== "C")
    };
  })() : null;

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 font-sans selection:bg-indigo-150 selection:text-indigo-900 pb-12">
      {/* print styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print, button, .sticky {
            display: none !important;
          }
          body, .bg-slate-50 {
            background-color: #ffffff !important;
            color: #0f172a !important;
          }
          .max-w-5xl {
            max-width: 100% !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .border-slate-200 {
            border-color: #cbd5e1 !important;
          }
        }
      `}} />

      {/* header */}
      <div className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-md no-print">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-lg tracking-tight text-slate-900" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>TestTracker</div>
              <div className="text-[11px] text-slate-500 font-medium">JEE / EAMCET · Diagnostics & Revision Planner · {tests.length} tests</div>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              {[["overview", "Overview"], ["upload", "Upload Paper"]].map(([v, l]) => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${view === v ? "bg-white text-slate-850 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{l}</button>
              ))}
            </div>
            {tests.length > 0 && view === "overview" && (
              <button onClick={() => window.print()} className="px-3.5 py-2 border border-slate-350 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer">
                Export PDF
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 print-full">
        {err && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6 text-sm flex items-center gap-3 no-print"><span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />{err}</div>}

        {/* ---------------- UPLOAD ---------------- */}
        {view === "upload" && !draft && (
          <Card className="max-w-2xl mx-auto no-print">
            <Label>Upload test paper</Label>
            <p className="text-sm text-slate-500 mb-4 leading-relaxed">
              Upload the scanned, graded PDF. Gemini parses the +4 / −1 / 0 marks, estimates question difficulty, and tags every question under the standard taxonomy.
            </p>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 hover:border-blue-500/50 hover:bg-blue-50/10 transition-all duration-300 text-center cursor-pointer relative">
              <input type="file" accept="application/pdf" disabled={busy}
                onChange={(e) => e.target.files[0] && extractPdf(e.target.files[0])}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
              <div className="flex flex-col items-center justify-center gap-2.5">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <div className="text-sm font-semibold text-slate-700">Click or drag PDF here to upload</div>
                <div className="text-xs text-slate-400">Up to 30 MB · Graded JEE/EAMCET test paper</div>
              </div>
            </div>
            {busy && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-150 rounded-xl text-xs text-blue-700 flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                Reading and classifying PDF... this can take 20–40 seconds for a full paper.
              </div>
            )}
            {tests.length === 0 && (
              <div className="mt-6 pt-5 border-t border-slate-100 flex justify-center">
                <button onClick={() => saveTest(SEED, false)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold transition-all shadow-md active:scale-95 cursor-pointer">
                  Load Seed Paper (LJ CT02)
                </button>
              </div>
            )}
          </Card>
        )}

        {/* ---------------- REVIEW DRAFT ---------------- */}
        {view === "upload" && draft && (
          <div className="flex flex-col gap-4 no-print">
            <Card>
              <Label>Review before saving</Label>
              <div className="flex flex-wrap gap-4 items-end mt-2">
                <div className="flex-1 min-w-[280px]">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Test Name</div>
                  <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-800 focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Date</div>
                  <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                    className="bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-800 focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-3">
                Click any bubble to cycle Correct → Wrong → Unattempted. Verify against the markings on the scanned paper.
              </p>
            </Card>
            <Card><OMRGrid questions={draft.questions} onFlip={flipDraft} /></Card>
            
            <Card className="max-h-[300px] overflow-y-auto">
              <Label>Classification Preview</Label>
              <p className="text-[11px] text-slate-500 mb-4">Verify how each question was classified before saving.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {SUBJECTS.map((s) => {
                  const qs = draft.questions.filter((q) => q.subject === s);
                  return (
                    <div key={s} className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                      <div className="text-xs font-bold mb-2 pb-1 border-b border-slate-200" style={{ color: SUBJ_COLOR[s] }}>{s}</div>
                      <div className="max-h-[160px] overflow-y-auto pr-1">
                        {qs.map((q) => {
                          const normQ = normalizeQuestion(q);
                          return (
                            <div key={normQ.q} className="text-[11px] flex justify-between py-1 border-b border-dashed border-slate-200">
                              <span className="font-semibold text-slate-500">Q{normQ.q}:</span>
                              <span className="text-right text-slate-700 pl-2 truncate" title={`${normQ.chapter} > ${normQ.subtopic}`}>
                                {normQ.chapter} &gt; {normQ.subtopic} ({normQ.difficulty})
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
                  <button onClick={() => setDraft(null)} className="px-4 py-2 border border-slate-350 hover:bg-slate-100 rounded-lg text-xs font-bold transition-all cursor-pointer">Discard</button>
                  <button onClick={saveDraft} className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-500 text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer">Save test</button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ---------------- OVERVIEW ---------------- */}
        {view === "overview" && (
          tests.length === 0 ? (
            <Card className="text-center py-16 max-w-xl mx-auto no-print">
              <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-250 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div className="text-base font-bold text-slate-700">No tests loaded yet</div>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mt-2 mb-6 leading-relaxed">Upload a scanned weekend paper to automatically parse, classify, and track your progress.</p>
              <button onClick={() => setView("upload")} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer">Upload Paper</button>
            </Card>
          ) : (
            <div className="flex flex-col gap-5">
              {/* headline diagnostics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(() => {
                  const last = tests[tests.length - 1];
                  const st = subjectStats(last.questions);
                  const blanksLost = st.u * 4;
                  const negativesLost = st.w * 5;
                  return (<>
                    <Card><Label>Latest total</Label><Big>{st.marks} <span className="text-xs text-slate-500 font-medium">/ 300</span></Big>
                      <div className="text-[11px] text-slate-500 font-medium mt-1">{st.c} correct / {st.w} wrong</div></Card>
                    <Card><Label>Blanks Lost</Label><Big color={C.amber}>−{blanksLost}</Big><div className="text-[11px] text-slate-500 mt-1">{st.u} unattempted (4m each)</div></Card>
                    <Card><Label>Negatives Penalty</Label><Big color={C.red}>−{negativesLost}</Big><div className="text-[11px] text-slate-500 mt-1">{st.w} wrong (5m lost each)</div></Card>
                    {latestDiagnosis && (
                      <Card className={latestDiagnosis.type === "speed" ? "bg-amber-50/30 border-amber-200" : "bg-red-50/30 border-red-200"}>
                        <Label>Weekly Diagnosis</Label>
                        <div className="font-bold text-sm" style={{ color: latestDiagnosis.type === "speed" ? C.amber : C.red }}>{latestDiagnosis.label}</div>
                        <div className="text-[10px] text-slate-500 mt-1.5 leading-snug">{latestDiagnosis.type === "speed" ? "Needs speed/time practice." : "Avoid guessing; clarify concepts."}</div>
                      </Card>
                    )}
                  </>);
                })()}
              </div>

              {/* diagnostic recommendations block */}
              {latestDiagnosis && (
                <Card className={`border-l-4 ${latestDiagnosis.type === "speed" ? "border-amber-500 bg-amber-50/10" : "border-red-500 bg-red-50/10"}`}>
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: latestDiagnosis.type === "speed" ? C.amber : C.red }} />
                    Latest Diagnostic Recommendation
                  </h4>
                  <p className="text-xs text-slate-650 mt-1.5 leading-relaxed">{latestDiagnosis.desc}</p>
                </Card>
              )}

              {/* trend layout: Marks lost chart */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tests.length >= 2 && (
                  <Card>
                    <Label>Diagnostics: Marks Lost comparison</Label>
                    <p className="text-[10px] text-slate-500 mb-3 leading-snug">Negatives (Wrong * 5) vs Blanks (Unattempted * 4) lost across weeks. Lower is better.</p>
                    <div className="h-64 mt-3">
                      <ResponsiveContainer>
                        <AreaChart data={diagnosticsTrend} margin={{ top: 10, right: 20, bottom: 0, left: -25 }}>
                          <defs>
                            <linearGradient id="colorBlanks" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={C.amber} stopOpacity={0.15}/>
                              <stop offset="95%" stopColor={C.amber} stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorNegatives" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={C.red} stopOpacity={0.15}/>
                              <stop offset="95%" stopColor={C.red} stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                          <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend iconType="circle" />
                          <Area type="monotone" name="Blanks Lost" dataKey="Blanks (Potential Lost)" stroke={C.amber} fillOpacity={1} fill="url(#colorBlanks)" strokeWidth={2} dot={{ r: 3 }} />
                          <Area type="monotone" name="Negatives Penalty" dataKey="Negatives (Penalty Lost)" stroke={C.red} fillOpacity={1} fill="url(#colorNegatives)" strokeWidth={2} dot={{ r: 3 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                )}

                {tests.length >= 2 && (
                  <Card>
                    <Label>Weekly subject trend</Label>
                    <p className="text-[10px] text-slate-500 mb-3 leading-snug">Average scores gained in Physics, Chemistry, and Mathematics each week.</p>
                    <div className="h-64 mt-3">
                      <ResponsiveContainer>
                        <AreaChart data={trend} margin={{ top: 10, right: 20, bottom: 0, left: -25 }}>
                          <defs>
                            <linearGradient id="colorP" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={SUBJ_COLOR.Physics} stopOpacity={0.15}/>
                              <stop offset="95%" stopColor={SUBJ_COLOR.Physics} stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorC" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={SUBJ_COLOR.Chemistry} stopOpacity={0.15}/>
                              <stop offset="95%" stopColor={SUBJ_COLOR.Chemistry} stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorM" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={SUBJ_COLOR.Maths} stopOpacity={0.15}/>
                              <stop offset="95%" stopColor={SUBJ_COLOR.Maths} stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                          <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend iconType="circle" />
                          <Area type="monotone" name="Physics" dataKey="Physics" stroke={SUBJ_COLOR.Physics} fillOpacity={1} fill="url(#colorP)" strokeWidth={2} dot={{ r: 3 }} />
                          <Area type="monotone" name="Chemistry" dataKey="Chemistry" stroke={SUBJ_COLOR.Chemistry} fillOpacity={1} fill="url(#colorC)" strokeWidth={2} dot={{ r: 3 }} />
                          <Area type="monotone" name="Maths" dataKey="Maths" stroke={SUBJ_COLOR.Maths} fillOpacity={1} fill="url(#colorM)" strokeWidth={2} dot={{ r: 3 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                )}
              </div>

              {/* Syllabus coverage heatmap */}
              <Card>
                <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
                  <div>
                    <Label>Syllabus Coverage Heatmap</Label>
                    <p className="text-[10px] text-slate-500 leading-snug">Visual mapping of syllabus chapters based on performance across all weekend tests.</p>
                  </div>
                  <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg no-print">
                    {["All", ...SUBJECTS].map((s) => (
                      <button key={s} onClick={() => setMapSubjFilter(s)}
                        className={`px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${mapSubjFilter === s ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="mt-4 flex flex-wrap gap-2">
                  {filteredSyllabus.map((item) => {
                    let bg = "bg-slate-100 text-slate-400 border-slate-200/50";
                    let dot = "bg-slate-300";
                    let label = "Untested";
                    
                    if (item.status === "weak") {
                      bg = "bg-red-50 text-red-700 border-red-150";
                      dot = "bg-red-500 animate-pulse";
                      label = `Weak (${Math.round(item.acc * 100)}% accuracy)`;
                    } else if (item.status === "developing") {
                      bg = "bg-amber-50/70 text-amber-700 border-amber-150";
                      dot = "bg-amber-500";
                      label = `Developing (${Math.round(item.acc * 100)}% accuracy)`;
                    } else if (item.status === "strong") {
                      bg = "bg-emerald-50 text-emerald-700 border-emerald-150";
                      dot = "bg-emerald-500";
                      label = `Strong (${Math.round(item.acc * 100)}% accuracy)`;
                    }

                    return (
                      <div key={item.subject + "::" + item.chapter} title={`${item.chapter} · ${item.subject} · ${label}`}
                        className={`px-2.5 py-1 rounded-xl text-xs border font-medium flex items-center gap-1.5 transition-transform hover:scale-[1.03] select-none ${bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                        <span>{item.chapter}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Section analysis & Difficulty Breakdown */}
              {latestAnalysis && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* MCQ vs Numerical analysis */}
                  <Card>
                    <Label>Latest test: Section-Type Analysis</Label>
                    <p className="text-[10px] text-slate-500 mb-4 leading-snug">Compare MCQ (+4 / -1) vs Integer type (numerical value, no negatives) performance.</p>
                    <div className="flex flex-col gap-4">
                      {["mcq", "int"].map((key) => {
                        const isMcq = key === "mcq";
                        const stats = isMcq ? latestAnalysis.sections.mcq : latestAnalysis.sections.int;
                        return (
                          <div key={key} className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs font-bold text-slate-700">{isMcq ? "Single Correct (MCQ)" : "Numerical / Integer-Type"}</span>
                              <span className="text-xs font-semibold text-slate-800">{stats.marks} marks ({stats.c} correct)</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-xs mt-2 pt-2 border-t border-slate-200/50">
                              <div>
                                <span className="text-slate-500">Attempt Rate:</span>{" "}
                                <span className="font-bold text-slate-700">{Math.round(stats.attRate * 100)}%</span>
                              </div>
                              <div>
                                <span className="text-slate-500">Accuracy:</span>{" "}
                                <span className="font-bold text-slate-700">{Math.round(stats.acc * 100)}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>

                  {/* Difficulty adjustment card */}
                  <Card>
                    <Label>Latest test: Difficulty stats & Dropped Easy Marks</Label>
                    <div className="grid grid-cols-3 gap-2 text-center border-b border-slate-100 pb-3 mb-3">
                      {latestAnalysis.difficulty.map((d) => (
                        <div key={d.difficulty} className="p-2 bg-slate-50 rounded-xl">
                          <div className="text-[10px] font-bold text-slate-500 uppercase">{d.difficulty}</div>
                          <div className="text-sm font-bold text-slate-800 mt-1">{Math.round(d.acc * 100)}% acc</div>
                          <div className="text-[9px] text-slate-400 font-medium">{d.c}/{d.total - d.u} att</div>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-700 mb-1">Dropped Easy Questions</div>
                      {latestAnalysis.droppedEasy.length === 0 ? (
                        <p className="text-[11px] text-emerald-600 font-medium bg-emerald-50 border border-emerald-100 p-2 rounded-lg">✓ Perfect score on easy questions! Keep it up.</p>
                      ) : (
                        <div className="flex flex-col gap-1.5 mt-2">
                          <p className="text-[10px] text-slate-500 leading-snug">Failing easy questions hurts rank the most. Re-solve these immediately:</p>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {latestAnalysis.droppedEasy.map(q => (
                              <span key={q.q} title={`${q.chapter} > ${q.subtopic}`} className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600 border border-red-100">
                                Q{q.q} ({q.subject}) · {q.result === "W" ? "Wrong" : "Unattempted"}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              )}

              {/* AI Study Planner */}
              <Card className="no-print">
                <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100 mb-4">
                  <div>
                    <Label>AI revision plan generator</Label>
                    <p className="text-[10px] text-slate-500 leading-snug">Generate a customized weekly study strategy from Gemini based on your recurring weak chapters.</p>
                  </div>
                  <button onClick={generateRevisionPlan} disabled={generatingPlan}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-100 cursor-pointer disabled:opacity-50">
                    {generatingPlan ? "Analyzing syllabus..." : "Generate Study Plan"}
                  </button>
                </div>
                {revisionPlan ? (
                  <div className="bg-slate-50/50 border border-slate-150 rounded-xl p-4 mt-2">
                    {renderMarkdown(revisionPlan)}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 text-center py-4">Click the button above to generate dynamic recommendations for this week.</p>
                )}
              </Card>

              {/* weak chapters listing (EAMCET vs JEE Weight priority) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
                    <div>
                      <Label>Weak Chapters — weakest first (all tests)</Label>
                      <p className="text-[10px] text-slate-500 leading-snug">Target revision by exam weightings (JEE vs EAMCET).</p>
                    </div>
                    <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg no-print">
                      {[null, ...SUBJECTS].map((s) => (
                        <button key={s || "all"} onClick={() => setSubjFilter(s)}
                          className={`px-3 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${subjFilter === s ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
                          {s || "All"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 divide-y divide-slate-100">
                    {chapterAgg(tests, subjFilter).map((r) => {
                      const subjWt = WEIGHTS[r.subject];
                      const chWt = subjWt && subjWt[r.chapter];
                      const isRecurring = recurringWeak.some(x => x.subject === r.subject && x.chapter === r.chapter);

                      return (
                        <div key={r.subject + r.chapter} className="py-3 flex flex-col gap-1 hover:bg-slate-50/50 transition-colors">
                          <div className="flex justify-between items-start flex-wrap gap-1">
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: SUBJ_COLOR[r.subject] }} />
                              {r.chapter}
                            </span>
                            <span className="font-mono text-xs font-bold text-slate-800">
                              Net: {r.c * 4 - r.w > 0 ? `+${r.c * 4 - r.w}` : r.c * 4 - r.w}m
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                            <div className="flex gap-2">
                              <span>Qs: {r.n}</span>
                              <span>•</span>
                              <span>Acc: {r.acc === null ? "—" : Math.round(r.acc * 100) + "%"}</span>
                            </div>
                            {chWt && (
                              <div className="flex gap-2 font-semibold">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] ${chWt.jee === "High" ? "bg-red-50 text-red-600 border border-red-100" : "bg-slate-100 text-slate-500"}`}>JEE: {chWt.jee}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[8px] ${chWt.eamcet === "High" ? "bg-indigo-50 text-indigo-600 border border-indigo-100" : "bg-slate-100 text-slate-500"}`}>EAMCET: {chWt.eamcet}</span>
                              </div>
                            )}
                          </div>

                          {isRecurring && (
                            <div className="mt-1.5 flex items-center gap-1 text-[9px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-lg w-max">
                              <span>🚨 Recurring Weak Topic (red in 3+ tests)</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* test list */}
                <Card>
                  <Label>Tests</Label>
                  <div className="flex flex-col gap-3 mt-2">
                    {tests.map((t, i) => {
                      const st = subjectStats(t.questions);
                      return (
                        <div key={t.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all duration-200">
                          <div>
                            <div className="font-semibold text-sm text-slate-800">T{i + 1} · {t.name}</div>
                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                              <span>{t.date}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-indigo-600 font-semibold">{st.marks}/300 marks</span>
                              <span className="text-slate-300">•</span>
                              <div className="flex gap-2">
                                {SUBJECTS.map((s) => (
                                  <span key={s} className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ color: SUBJ_COLOR[s], backgroundColor: `${SUBJ_COLOR[s]}10` }}>
                                    {s[0]}: {subjectStats(t.questions, s).marks}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 no-print">
                            <button onClick={() => setView("test:" + t.id)} className="px-3.5 py-1.5 rounded-lg border border-slate-250 bg-slate-50 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer">Open</button>
                            <button onClick={() => { if (confirm("Delete this test?")) removeTest(t.id); }} className="px-3.5 py-1.5 rounded-lg border border-red-100 bg-red-50 text-xs font-semibold text-red-500 hover:bg-red-100/50 transition-all cursor-pointer">Delete</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            </div>
          )
        )}

        {/* ---------------- SINGLE TEST ---------------- */}
        {current && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <div>
                <div className="font-bold text-xl tracking-tight text-slate-900" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{current.name}</div>
                <div className="text-xs text-slate-500 mt-1 font-medium">{current.date}</div>
              </div>
              <button onClick={() => setView("overview")} className="px-3.5 py-2 rounded-lg border border-slate-250 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-all cursor-pointer no-print">← Back to overview</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {SUBJECTS.map((s) => { const st = subjectStats(current.questions, s); return (
                <Card key={s}><Label>{s}</Label><Big color={SUBJ_COLOR[s]}>{st.marks} <span className="text-[11px] text-slate-500 font-medium">/ 100</span></Big>
                  <div className="text-[11px] text-slate-500 mt-1">{st.c} ✓ · {st.w} ✗ · {st.u} blank</div></Card>); })}
              <Card><Label>Total Score</Label><Big>{subjectStats(current.questions).marks} <span className="text-[11px] text-slate-500 font-medium">/ 300</span></Big>
                <div className="text-[11px] text-slate-500 mt-1">{Math.round(subjectStats(current.questions).attPct * 100)}% attempted</div></Card>
            </div>
            <Card>
              <Label>Answer sheet</Label>
              <div className="text-xs text-slate-500 mb-4 font-medium">Green = correct, red = wrong, blank = unattempted. Hover a bubble for details.</div>
              <OMRGrid questions={current.questions} />
            </Card>
            <Card>
              <Label>Chapter breakdown — this test, weakest first</Label>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm text-slate-650">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                      <th className="py-2.5 px-4">Chapter</th>
                      <th className="py-2.5 px-4">Breakdown</th>
                      <th className="py-2.5 px-4">Accuracy</th>
                      <th className="py-2.5 px-4 text-right">Net Marks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {chapterAgg([current], null).map((r) => (
                      <tr key={r.subject + r.chapter} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-800 flex items-center gap-2.5">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: SUBJ_COLOR[r.subject] }} />
                          {r.chapter}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-500 font-mono font-medium">{r.c}✓ {r.w}✗ {r.u} blank</td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <span className="w-10 font-mono text-xs text-slate-500">{r.acc === null ? "—" : Math.round(r.acc * 100) + "%"}</span>
                            <div className="w-24"><ProgressBar pct={r.acc || 0} color={r.acc >= 0.7 ? C.green : r.acc >= 0.4 ? C.amber : C.red} /></div>
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
