import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import { CheckCircle2, ShieldCheck, ArrowRight, LockKeyhole, FileText, Smartphone, MonitorSmartphone, Send, CreditCard, Receipt, PlusCircle } from "lucide-react";

// ========================
// OCBC color nuance
// ========================
const OCBC_RED = "#d71920"; // primary accent
const OCBC_DARK = "#1f2937"; // slate-800
const OCBC_LIGHT = "#f8f9fb"; // light bg

// ========================
// Helpers
// ========================
function currency(n) {
  if (!Number.isFinite(n)) return "-";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
function pct(n) {
  return `${(n * 100).toFixed(1)}%`;
}
// Simple compound projection
function project({ initial, recurring, years, r }) {
  const months = Math.max(0, Math.round((years || 0) * 12));
  const rm = r / 12;
  let bal = initial;
  const arr = [{ month: 0, value: bal }];
  for (let m = 1; m <= months; m++) {
    bal = bal * (1 + rm) + recurring;
    arr.push({ month: m, value: bal });
  }
  return arr;
}
function optimizeParams({ target, initial, recurring, years, r }) {
  const fv = project({ initial, recurring, years, r }).at(-1).value;
  if (fv >= target) return { kind: "none" };
  // bump recurring up to 10x
  let rc = recurring;
  while (rc <= recurring * 10) {
    rc += Math.max(10, Math.ceil(recurring * 0.05));
    if (project({ initial, recurring: rc, years, r }).at(-1).value >= target) return { kind: "recurring", value: rc };
  }
  // extend tenor up to +10y
  for (let extra = 1; extra <= 10; extra++) {
    const y = years + extra;
    if (project({ initial, recurring, years: y, r }).at(-1).value >= target) return { kind: "tenor", value: y };
  }
  // combined
  const rcUp = recurring * 1.25;
  for (let extra = 1; extra <= 10; extra++) {
    const y = years + extra;
    const val = project({ initial, recurring: rcUp, years: y, r }).at(-1).value;
    if (val >= target) return { kind: "both", recurring: Math.round(rcUp), years: y };
  }
  return { kind: "impossible" };
}

// ========================
// Model portfolios (mock)
// ========================
const MODELS = [
  { id: "conservative", name: "Conservative", risk: "Low", expReturn: 0.04, volatility: 0.06,
    instruments: [
      { code: "OCBC Bond Fund A", alloc: 50, facts: "Investment grade bonds, short duration." },
      { code: "OCBC Stable Income", alloc: 30, facts: "Diversified Asian bond exposure." },
      { code: "OCBC Money Market", alloc: 20, facts: "Capital preservation & liquidity." },
    ], color: OCBC_RED },
  { id: "moderate", name: "Moderate", risk: "Low–Medium", expReturn: 0.06, volatility: 0.10,
    instruments: [
      { code: "OCBC Global Balanced", alloc: 40, facts: "60/40 equity-bond blend." },
      { code: "OCBC Asia Equity Index", alloc: 35, facts: "Broad Asia ex‑Japan equities." },
      { code: "OCBC Short Duration Bond", alloc: 25, facts: "Short duration gov/corp bonds." },
    ], color: OCBC_RED },
  { id: "balanced", name: "Balanced", risk: "Medium", expReturn: 0.08, volatility: 0.14,
    instruments: [
      { code: "OCBC Global Equity", alloc: 55, facts: "Developed market large/mid caps." },
      { code: "OCBC EM Equity", alloc: 25, facts: "Emerging markets tilt." },
      { code: "OCBC Aggregate Bond", alloc: 20, facts: "Diversified global bonds." },
    ], color: OCBC_RED },
  { id: "aggressive", name: "Aggressive", risk: "High", expReturn: 0.10, volatility: 0.20,
    instruments: [
      { code: "OCBC Tech Innovators", alloc: 50, facts: "Global tech & innovation leaders." },
      { code: "OCBC Small Cap Growth", alloc: 30, facts: "SMID growth exposure." },
      { code: "OCBC Global Bond Hedged", alloc: 20, facts: "Risk anchor & FX hedging." },
    ], color: OCBC_RED },
];

// Risk Qs (5)
const QUESTIONS = [
  { id: "q1", q: "What is your primary investment goal?", a: [
    { k: "Capital preservation", s: 1 }, { k: "Income", s: 2 }, { k: "Balanced growth", s: 3 }, { k: "Aggressive growth", s: 4 } ] },
  { id: "q2", q: "How would you react to a 10% market drop in a month?", a: [
    { k: "Sell to avoid further loss", s: 1 }, { k: "Wait it out", s: 2 }, { k: "Buy more (opportunity)", s: 4 }, { k: "Rebalance systematically", s: 3 } ] },
  { id: "q3", q: "Investment horizon", a: [
    { k: "< 2 years", s: 1 }, { k: "2–5 years", s: 2 }, { k: "5–10 years", s: 3 }, { k: "> 10 years", s: 4 } ] },
  { id: "q4", q: "Experience with investments", a: [
    { k: "None", s: 1 }, { k: "Some (funds/bonds)", s: 2 }, { k: "Experienced (equities)", s: 3 }, { k: "Advanced (derivatives)", s: 4 } ] },
  { id: "q5", q: "Comfort with short‑term volatility", a: [
    { k: "Low", s: 1 }, { k: "Moderate", s: 2 }, { k: "Comfortable", s: 3 }, { k: "High", s: 4 } ] },
];

function scoreToRisk(total) {
  if (total <= 8) return "conservative";
  if (total <= 12) return "moderate";
  if (total <= 16) return "balanced";
  return "aggressive";
}

// ========================
// Main Component
// ========================
export default function OCBCOnboardingFlow() {
  // portal or flow
  const [mode, setMode] = useState("web");
  const [view, setView] = useState("dashboard");

  // flow steps
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [goal, setGoal] = useState("");
  const [target, setTarget] = useState("");
  const [tenor, setTenor] = useState("");
  const [initial, setInitial] = useState("");
  const [recurring, setRecurring] = useState("");
  const [freq, setFreq] = useState("");
  const [selectedModel, setSelectedModel] = useState(null);
  const [consent, setConsent] = useState(false);
  const [password, setPassword] = useState("");

  // seeded portfolios
  const [portfolios, setPortfolios] = useState([
    { id: 'demo1', modelId: 'moderate', name: 'Education Fund', inception: new Date(Date.now() - 300*24*60*60*1000).toISOString(), initialAmt: 10000, recurringPerMonth: 500, years: 10, target: 50000, goal: 'Kids Education' },
    { id: 'demo2', modelId: 'balanced', name: 'Retirement', inception: new Date(Date.now() - 500*24*60*60*1000).toISOString(), initialAmt: 15000, recurringPerMonth: 700, years: 15, target: 200000, goal: 'Retirement' },
    { id: 'demo3', modelId: 'conservative', name: 'Emergency Reserve', inception: new Date(Date.now() - 120*24*60*60*1000).toISOString(), initialAmt: 8000, recurringPerMonth: 300, years: 5 },
  ]);

  // derived
  const totalScore = useMemo(() => Object.values(answers).reduce((a, b) => a + b, 0), [answers]);
  const riskModel = useMemo(() => MODELS.find(m => m.id === scoreToRisk(totalScore)) || MODELS[0], [totalScore]);
  const isGoalProvided = Boolean(goal || target || tenor);
  const freqPerYear = freq === "Monthly" ? 12 : freq === "Quarterly" ? 4 : freq === "Semi Annually" ? 2 : 0;
  const years = Number(tenor || 0);
  const recurringPerMonth = freqPerYear ? Number(recurring || 0) * (freqPerYear / 12) : 0;
  const initialAmt = Number(initial || 0);
  const targetAmt = Number(target || 0);
  const model = selectedModel ? (MODELS.find(m => m.id === selectedModel) || riskModel) : riskModel;
  const chartData = useMemo(() => {
    const r = model.expReturn;
    const pts = project({ initial: initialAmt, recurring: recurringPerMonth, years: years || 10, r });
    return pts.map(p => ({ month: p.month, value: Math.round(p.value) }));
  }, [model, initialAmt, recurringPerMonth, years]);
  const endValue = chartData.at(-1)?.value ?? 0;
  const onTrack = isGoalProvided && targetAmt > 0 ? endValue >= targetAmt : undefined;
  const optimize = useMemo(() => {
    if (!isGoalProvided || !years || !targetAmt) return null;
    return optimizeParams({ target: targetAmt, initial: initialAmt, recurring: recurringPerMonth, years, r: model.expReturn });
  }, [isGoalProvided, years, targetAmt, initialAmt, recurringPerMonth, model.expReturn]);

  // utils
  function resetAll() {
    setStep(0); setAnswers({}); setGoal(""); setTarget(""); setTenor(""); setInitial(""); setRecurring(""); setFreq(""); setSelectedModel(null); setConsent(false); setPassword("");
  }
  function formatDate(iso) { const d = new Date(iso); return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
  function finalizeSubscription() {
    const p = { id: String(Date.now()), modelId: model.id, name: goal || `${model.name} Portfolio`, inception: new Date().toISOString(), initialAmt, recurringPerMonth, years: years || 10, target: isGoalProvided && targetAmt ? targetAmt : undefined, goal: goal || undefined };
    setPortfolios(arr => [p, ...arr]); resetAll(); setView('dashboard');
  }

  // layout helpers
  const containerMaxW = mode === "mobile" ? "max-w-sm" : "max-w-5xl";
  const gridCols = mode === "mobile" ? "grid-cols-1" : "grid-cols-2";

  // ========================
  // DASHBOARD VIEW
  // ========================
  if (view === 'dashboard') {
    // mock account & promos
    const ACTIVE_ACCOUNT = { name: 'OCBC 360 Account', number: '123-456-789', currency: 'USD', balance: 25340.75 };
    const PROMOS = [
      { id: 'p1', title: 'Earn up to 4.0% p.a.', body: 'Top up to savings goals and enjoy bonus interest.', cta: 'Learn more' },
      { id: 'p2', title: '0% FX Fees this month', body: 'Use your OCBC Card for overseas spend.', cta: 'Activate' },
      { id: 'p3', title: 'Refer & Earn', body: 'Invite friends to OCBC Wealth and get rewards.', cta: 'Refer now' },
    ];

    return (
      <div className={`w-full min-h-screen mx-auto ${containerMaxW} p-4 sm:p-8`} style={{ background: OCBC_LIGHT }}>
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: OCBC_RED }}>
              <ShieldCheck className="text-white" size={20} />
            </div>
            <div>
              <div className="text-sm text-slate-600">Client Portal</div>
              <div className="text-xl font-semibold" style={{ color: OCBC_DARK }}>OCBC Wealth</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button style={{ backgroundColor: OCBC_RED }} onClick={() => { setView('flow'); resetAll(); }}>+ Add Investment</Button>
            <div className="flex items-center gap-2">
              <MonitorSmartphone size={18} className="text-slate-500" />
              <Switch checked={mode === "mobile"} onCheckedChange={(v) => setMode(v ? "mobile" : "web")} />
              <Smartphone size={18} className="text-slate-500" />
              <span className="text-xs text-slate-600">{mode === "mobile" ? "Mobile" : "Website"}</span>
            </div>
          </div>
        </div>

        {/* Dashboard content */}
        <div className="grid gap-6">
          {/* Active Account */}
          <Card className="rounded-2xl shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Active Account</CardTitle>
              <CardDescription>{ACTIVE_ACCOUNT.name} • {ACTIVE_ACCOUNT.number}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between flex-wrap gap-4">
                <div>
                  <div className="text-sm text-slate-600">Available Balance</div>
                  <div className="text-3xl font-semibold">{currency(ACTIVE_ACCOUNT.balance)}</div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" className="rounded-xl" style={{ borderColor: OCBC_RED }}><Send size={16} className="mr-2"/>Transfer</Button>
                  <Button variant="outline" className="rounded-xl" style={{ borderColor: OCBC_RED }}><Receipt size={16} className="mr-2"/>Pay Bills</Button>
                  <Button variant="outline" className="rounded-xl" style={{ borderColor: OCBC_RED }}><PlusCircle size={16} className="mr-2"/>Top Up</Button>
                  <Button variant="outline" className="rounded-xl" style={{ borderColor: OCBC_RED }}><CreditCard size={16} className="mr-2"/>Cards</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Promotions */}
          <Card className="rounded-2xl shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Promotions</CardTitle>
              <CardDescription>Latest OCBC offers for you</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {PROMOS.map(p => (
                  <div key={p.id} className="min-w-[260px] bg-white border rounded-xl p-4">
                    <div className="text-base font-semibold mb-1">{p.title}</div>
                    <div className="text-sm text-slate-600 mb-3">{p.body}</div>
                    <Button size="sm" style={{ backgroundColor: OCBC_RED }}>{p.cta}</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Investments section header */}
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">Your Investments</div>
            <Button style={{ backgroundColor: OCBC_RED }} onClick={() => { setView('flow'); resetAll(); }}>+ Add Investment</Button>
          </div>

          {/* Investment widgets */}
          {portfolios.length === 0 ? (
            <Card className="rounded-2xl shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl">No investments yet</CardTitle>
                <CardDescription>Start by adding one to see performance here.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button style={{ backgroundColor: OCBC_RED }} onClick={() => { setView('flow'); resetAll(); }}>Add Investment</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 grid-cols-1 gap-6">
              {portfolios.map((p) => {
                const m = MODELS.find(mm => mm.id === p.modelId) || MODELS[0];
                const data = project({ initial: p.initialAmt, recurring: p.recurringPerMonth, years: Math.max(1, p.years), r: m.expReturn }).map(pt => ({ month: pt.month, value: Math.round(pt.value) }));
                const latest = data.at(-1)?.value || 0;
                return (
                  <Card key={p.id} className="rounded-2xl shadow-lg">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center justify-between">
                        {p.name}
                        <span className="text-xs px-2 py-1 rounded-full" style={{ background: '#fde2e2', color: OCBC_RED }}>{m.name}</span>
                      </CardTitle>
                      <CardDescription>Inception: {formatDate(p.inception)}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-40 w-full bg-white rounded-xl border p-3">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" hide />
                            <YAxis hide />
                            <Tooltip formatter={(v) => currency(Number(v))} labelFormatter={(m) => `Month ${m}`} />
                            <Line type="monotone" dataKey="value" stroke={OCBC_RED} strokeWidth={2} dot={false} />
                            {p.target ? <ReferenceLine y={p.target} stroke="#16a34a" strokeDasharray="4 4" /> : null}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div className="text-sm text-slate-600">Latest Value</div>
                        <div className="font-semibold">{currency(latest)}</div>
                      </div>
                      <div className="flex items-center justify-end gap-2 mt-3">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" style={{ borderColor: OCBC_RED }}>Check Details</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{p.name} — Details</DialogTitle>
                              <DialogDescription>
                                Model: {m.name} ({m.risk})<br/>
                                Expected Return: {pct(m.expReturn)} p.a.<br/>
                                Recurring: {currency(p.recurringPerMonth)} / month eq.<br/>
                                Tenor: {p.years} years{p.target ? <> • Target: {currency(p.target)}</> : null}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="h-56 w-full bg-white rounded-xl border p-3">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="month" />
                                  <YAxis />
                                  <Tooltip formatter={(v) => currency(Number(v))} labelFormatter={(m) => `Month ${m}`} />
                                  <Line type="monotone" dataKey="value" stroke={OCBC_RED} strokeWidth={2} dot={false} />
                                  {p.target ? <ReferenceLine y={p.target} stroke="#16a34a" strokeDasharray="4 4" label={{ value: `Target ${currency(p.target)}`, position: 'insideTopRight' }} /> : null}
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-xs text-slate-500">Use “Add Investment” to open the onboarding flow. OCBC branding & colors applied.</div>
      </div>
    );
  }

  // ========================
  // FLOW VIEW (Onboarding)
  // ========================
  return (
    <div className={`w-full min-h-screen mx-auto ${containerMaxW} p-4 sm:p-8`} style={{ background: OCBC_LIGHT }}>
      {/* Top bar with mode toggle */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: OCBC_RED }}>
            <ShieldCheck className="text-white" size={20} />
          </div>
          <div>
            <div className="text-sm text-slate-600">Investment Onboarding</div>
            <div className="text-xl font-semibold" style={{ color: OCBC_DARK }}>OCBC Wealth</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <MonitorSmartphone size={18} className="text-slate-500" />
          <Switch checked={mode === "mobile"} onCheckedChange={(v) => setMode(v ? "mobile" : "web")} />
          <Smartphone size={18} className="text-slate-500" />
          <span className="text-xs text-slate-600">{mode === "mobile" ? "Mobile preview" : "Website preview"}</span>
        </div>
      </div>

      {/* Stepper */}
      <div className="mb-6">
        <div className="grid grid-cols-6 gap-2">
          {["Risk", "Goal", "Model", "Projection", "Confirm", "Success"].map((label, i) => (
            <div key={i} className={`h-2 rounded-full ${i <= step ? "bg-red-600" : "bg-red-200"}`} style={{ backgroundColor: i <= step ? OCBC_RED : "#f5c2c4" }} />
          ))}
        </div>
        <div className="flex justify-between text-xs mt-2 text-slate-600">
          <span>Risk Profile</span>
          <span>Goal Setup</span>
          <span>Model</span>
          <span>Projection</span>
          <span>Confirmation</span>
          <span>Done</span>
        </div>
      </div>

      {/* Step 0: Risk */}
      {step === 0 && (
        <Card className="shadow-xl rounded-2xl">
          <CardHeader>
            <CardTitle className="text-2xl">Risk Profile Questionnaire</CardTitle>
            <CardDescription>Answer 5 quick questions to assess your risk category.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className={`grid ${gridCols} gap-6`}>
              {QUESTIONS.map((q, idx) => (
                <div key={q.id} className="bg-white rounded-xl p-4 border">
                  <div className="font-medium mb-3">{idx + 1}. {q.q}</div>
                  <RadioGroup value={String(answers[q.id] || "")} onValueChange={(v) => setAnswers(a => ({ ...a, [q.id]: Number(v) }))}>
                    {q.a.map((opt, i) => (
                      <div className="flex items-center space-x-3 py-1" key={i}>
                        <RadioGroupItem value={String(opt.s)} id={`${q.id}-${i}`} />
                        <Label htmlFor={`${q.id}-${i}`}>{opt.k}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">Suggested risk based on current answers: <span className="font-semibold">{riskModel.name}</span></div>
              <Button onClick={() => setStep(1)} disabled={Object.keys(answers).length < 5} style={{ backgroundColor: OCBC_RED }}>Continue <ArrowRight className="ml-2" size={16} /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Goal Setup */}
      {step === 1 && (
        <Card className="shadow-xl rounded-2xl">
          <CardHeader>
            <CardTitle className="text-2xl">Goal Setup</CardTitle>
            <CardDescription>Optionally set a goal, target & tenor. Fill the required fields to continue.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className={`grid ${gridCols} gap-6`}>
              <div className="space-y-4">
                <div>
                  <Label>Goal (optional)</Label>
                  <Input placeholder="e.g., Kids' Education" value={goal} onChange={(e) => setGoal(e.target.value)} />
                </div>
                <div>
                  <Label>Target investment (optional)</Label>
                  <Input placeholder="e.g., 100000" inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value.replace(/[^0-9.]/g, ""))} />
                </div>
                <div>
                  <Label>Tenor (years) (optional)</Label>
                  <Input placeholder="e.g., 10" inputMode="numeric" value={tenor} onChange={(e) => setTenor(e.target.value.replace(/[^0-9.]/g, ""))} />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label>Initial Investment <span className="text-red-600">*</span></Label>
                  <Input placeholder="e.g., 5000" inputMode="numeric" value={initial} onChange={(e) => setInitial(e.target.value.replace(/[^0-9.]/g, ""))} />
                </div>
                <div>
                  <Label>Recurring Contribution <span className="text-red-600">*</span></Label>
                  <Input placeholder="e.g., 500" inputMode="numeric" value={recurring} onChange={(e) => setRecurring(e.target.value.replace(/[^0-9.]/g, ""))} />
                </div>
                <div>
                  <Label>Recurring Contribution Frequency <span className="text-red-600">*</span></Label>
                  <Select value={freq} onValueChange={setFreq}>
                    <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                      <SelectItem value="Quarterly">Quarterly</SelectItem>
                      <SelectItem value="Semi Annually">Semi Annually</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
              <Button onClick={() => setStep(2)} disabled={!initial || !recurring || !freq} style={{ backgroundColor: OCBC_RED }}>Continue <ArrowRight className="ml-2" size={16} /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Model Selection */}
      {step === 2 && (
        <Card className="shadow-xl rounded-2xl">
          <CardHeader>
            <CardTitle className="text-2xl">Model Portfolio Selection</CardTitle>
            <CardDescription>We suggest <span className="font-semibold">{riskModel.name}</span> based on your risk profile. You can choose any model.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className={`grid ${mode === "mobile" ? "grid-cols-1" : "grid-cols-4"} gap-4`}>
              {MODELS.map((m) => (
                <Card key={m.id} className={`border-2 ${selectedModel === m.id ? "border-red-600" : "border-transparent"} hover:border-red-400 transition`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center justify-between">
                      {m.name}
                      {selectedModel === m.id && <CheckCircle2 className="text-red-600" />}
                    </CardTitle>
                    <CardDescription>Risk: {m.risk}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div>Expected Return: <span className="font-semibold">{pct(m.expReturn)}</span></div>
                    <div>Volatility: <span className="font-semibold">{pct(m.volatility)}</span></div>
                    <div className="text-slate-600">Key holdings:</div>
                    <ul className="list-disc ml-5 text-slate-700">
                      {m.instruments.map((i) => (<li key={i.code}>{i.code} ({i.alloc}%)</li>))}
                    </ul>
                    <Button className="w-full mt-3" variant={selectedModel === m.id ? "default" : "outline"} style={{ backgroundColor: selectedModel === m.id ? OCBC_RED : undefined, borderColor: OCBC_RED }} onClick={() => setSelectedModel(m.id)}>Select</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)} style={{ backgroundColor: OCBC_RED }}>Continue <ArrowRight className="ml-2" size={16} /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Projection */}
      {step === 3 && (
        <Card className="shadow-xl rounded-2xl">
          <CardHeader>
            <CardTitle className="text-2xl">Projection & Portfolio Details</CardTitle>
            <CardDescription>
              {isGoalProvided && years && targetAmt ? <>Projection for <span className="font-semibold">{model.name}</span> against your target.</> : <>Projected performance for <span className="font-semibold">{model.name}</span>.</>}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <div className="h-72 w-full bg-white rounded-xl border p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tickFormatter={(m) => `${Math.round(Number(m) / 12)}y`} />
                    <YAxis tickFormatter={(v) => `$${(Number(v)/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => currency(Number(v))} labelFormatter={(m) => `Month ${m}`} />
                    <Line type="monotone" dataKey="value" stroke={OCBC_RED} strokeWidth={2.5} dot={false} />
                    {isGoalProvided && years && targetAmt ? (
                      <ReferenceLine y={targetAmt} stroke="#16a34a" strokeDasharray="5 5" label={{ value: `Target: ${currency(targetAmt)}`, position: "insideTopRight" }} />
                    ) : null}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="grid md:grid-cols-3 grid-cols-1 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Ending Value</CardTitle></CardHeader>
                  <CardContent className="text-2xl font-semibold">{currency(endValue)}</CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Total Contributions</CardTitle></CardHeader>
                  <CardContent className="text-2xl font-semibold">{currency(initialAmt + (recurringPerMonth * (years || 10) * 12))}</CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">On Track</CardTitle></CardHeader>
                  <CardContent className="text-2xl font-semibold">{onTrack === undefined ? "—" : onTrack ? "Yes" : "No"}</CardContent>
                </Card>
              </div>

              {isGoalProvided && years && targetAmt && onTrack === false && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="font-medium mb-2 text-red-700">Not on track for the target.</div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <div className="text-sm text-red-700">Try optimizing your plan.</div>
                    {optimize && optimize.kind !== "none" && optimize.kind !== "impossible" && (
                      <Button style={{ backgroundColor: OCBC_RED }} onClick={() => {
                        if (optimize.kind === "recurring") {
                          setRecurring(String(Math.round((optimize.value || 0) * (12 / (freqPerYear || 12)))));
                        } else if (optimize.kind === "tenor") {
                          setTenor(String(optimize.value));
                        } else if (optimize.kind === "both") {
                          setRecurring(String(Math.round((optimize.recurring || 0) * (12 / (freqPerYear || 12)))));
                          setTenor(String(optimize.years || years));
                        }
                      }}>Optimize Plan</Button>
                    )}
                  </div>
                  {optimize && (
                    <div className="mt-2 text-sm text-slate-700">
                      {optimize.kind === "recurring" && <>Suggestion: increase recurring to approx <b>{currency(optimize.value || 0)}</b> per month equivalent.</>}
                      {optimize.kind === "tenor" && <>Suggestion: extend tenor to <b>{optimize.value}</b> years.</>}
                      {optimize.kind === "both" && <>Suggestion: increase recurring to <b>{currency(optimize.recurring || 0)}</b> per month equivalent and extend tenor to <b>{optimize.years}</b> years.</>}
                      {optimize.kind === "impossible" && <>Suggestion: Consider revising multiple parameters or a higher-return model.</>}
                    </div>
                  )}
                </div>
              )}

              {/* Instruments & Fact Sheets */}
              <div>
                <div className="text-lg font-semibold mb-2">Instruments & Allocation</div>
                <div className="grid md:grid-cols-3 grid-cols-1 gap-3">
                  {model.instruments.map((inst, idx) => (
                    <Card key={inst.code}>
                      <CardHeader className="pb-1">
                        <CardTitle className="text-base flex items-center justify-between">
                          <span>{inst.code}</span>
                          <span className="text-sm text-slate-600">{inst.alloc}%</span>
                        </CardTitle>
                        <CardDescription>{inst.facts}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" style={{ borderColor: OCBC_RED }} className="w-full"><FileText className="mr-2" size={16} /> Fund Fact Sheet</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{inst.code} — Fund Fact Sheet</DialogTitle>
                              <DialogDescription>
                                Objective: {inst.facts}<br/>
                                Strategy: Diversified portfolio following the model allocation.<br/>
                                Fees: 0.{idx + 6}% p.a. | ISIN: MOCK{idx}{inst.code.split(' ').join('').slice(0,3).toUpperCase()}<br/>
                                Risk Level: {model.risk}
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={() => setStep(4)} style={{ backgroundColor: OCBC_RED }}>Continue <ArrowRight className="ml-2" size={16} /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Confirmation */}
      {step === 4 && (
        <Card className="shadow-xl rounded-2xl">
          <CardHeader>
            <CardTitle className="text-2xl">Confirmation</CardTitle>
            <CardDescription>Review fees, accept consent, then confirm your subscription.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className={`grid ${gridCols} gap-6`}>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Model Portfolio</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <div><b>Name:</b> {model.name}</div>
                  <div><b>Risk:</b> {model.risk}</div>
                  <div><b>Expected Return:</b> {pct(model.expReturn)} p.a.</div>
                  <div><b>Recurring:</b> {currency(recurringPerMonth)} / month equivalent</div>
                  {isGoalProvided && years && targetAmt ? (
                    <div className="pt-2"><b>Goal:</b> {goal || "(unnamed)"} • <b>Target:</b> {currency(targetAmt)} • <b>Tenor:</b> {years}y</div>
                  ) : (
                    <div className="pt-2 text-slate-600">No goal/target/tenor provided</div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Fees</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between"><span>Model Portfolio Fee</span><span className="font-semibold">0.60% p.a.</span></div>
                  <div className="flex items-center justify-between"><span>Underlying Fund Fees (weighted)</span><span className="font-semibold">0.45% p.a.</span></div>
                  <div className="flex items-center justify-between border-t pt-2"><span>Total Estimated</span><span className="font-semibold">1.05% p.a.</span></div>
                </CardContent>
              </Card>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl border bg-white">
              <input id="consent" type="checkbox" className="accent-red-600 w-4 h-4" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <Label htmlFor="consent" className="cursor-pointer">I have read and agree to the Terms, Risk Disclosure, and Fund Prospectuses.</Label>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep(3)}>Back</Button>
              <Button style={{ backgroundColor: OCBC_RED }} disabled={!consent} onClick={() => setStep(5)}>Confirm & Continue <LockKeyhole className="ml-2" size={16} /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Password */}
      {step === 5 && (
        <Card className="shadow-xl rounded-2xl">
          <CardHeader>
            <CardTitle className="text-2xl">Security Verification</CardTitle>
            <CardDescription>Enter your password to authorize subscription.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" placeholder="Enter any value" value={password} onChange={(e) => setPassword(e.target.value)} />
              <div className="text-xs text-slate-500">This demo accepts any value for illustration.</div>
            </div>
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep(4)}>Back</Button>
              <Button style={{ backgroundColor: OCBC_RED }} disabled={!password} onClick={() => setStep(6)}>Submit</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 6: Success */}
      {step === 6 && (
        <Card className="shadow-xl rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: OCBC_RED }}>
                <CheckCircle2 className="text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Your subscription is successful</CardTitle>
                <CardDescription>Thank you for investing with OCBC Wealth.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Subscription Summary</CardTitle></CardHeader>
              <CardContent className="grid md:grid-cols-3 grid-cols-1 gap-4 text-sm">
                <div className="space-y-1">
                  <div><b>Model:</b> {model.name} ({model.risk})</div>
                  <div><b>Expected Return:</b> {pct(model.expReturn)} p.a.</div>
                </div>
                <div className="space-y-1">
                  <div><b>Initial Investment:</b> {currency(initialAmt)}</div>
                  <div><b>Recurring:</b> {currency(recurringPerMonth)} / month eq.</div>
                </div>
                <div className="space-y-1">
                  {isGoalProvided && years && targetAmt ? (
                    <div><b>Goal/Target/Tenor:</b> {goal || "(unnamed)"} / {currency(targetAmt)} / {years}y</div>
                  ) : (
                    <div><b>Goal/Target/Tenor:</b> Not specified</div>
                  )}
                </div>
              </CardContent>
            </Card>
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => { resetAll(); setView('flow'); }}>Start New Subscription</Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Back to Top</Button>
                <Button style={{ backgroundColor: OCBC_RED }} onClick={finalizeSubscription}>Go to Dashboard</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-8 text-center text-xs text-slate-500">OCBC red styling & UI/UX accents applied throughout. This is a functional demo flow for both mobile and web layouts.</div>
    </div>
  );
}

// No props used yet; keep for future extension
OCBCOnboardingFlow.propTypes = {};
