// src/ocbc/OCBCOnboardingFlow.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { Input } from '@/components/ui/Input.jsx';
import { Label } from '@/components/ui/Label.jsx';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group.jsx';
import { Select, SelectItem } from '@/components/ui/Select.jsx';

const OCBC_RED = 'var(--ocbc-red, #d71920)';

const ocbcBgStyle = {
  backgroundImage:
    'radial-gradient(rgba(215,25,32,0.06) 1px, transparent 1px), radial-gradient(rgba(215,25,32,0.04) 1px, transparent 1px)',
  backgroundSize: '20px 20px, 40px 40px',
  backgroundPosition: '0 0, 10px 10px',
  backgroundColor: '#f8fafc',
};

const QUESTIONS = [
  { id: 'horizon', title: '1) What is your investment time horizon?', options: [
    { value: 'short', label: 'Less than 3 years', score: 0 },
    { value: 'medium', label: '3–7 years', score: 1 },
    { value: 'long', label: '7+ years', score: 2 },
  ]},
  { id: 'drawdown', title: '2) If your portfolio fell 15% in a month, what would you do?', options: [
    { value: 'sell', label: 'Sell to prevent further losses', score: 0 },
    { value: 'hold', label: 'Hold and wait for recovery', score: 1 },
    { value: 'buy', label: 'Invest more to average down', score: 2 },
  ]},
  { id: 'experience', title: '3) What is your investment knowledge/experience?', options: [
    { value: 'limited', label: 'Limited / new to investing', score: 0 },
    { value: 'some', label: 'Some knowledge of funds/ETFs', score: 1 },
    { value: 'advanced', label: 'Advanced with markets/derivatives', score: 2 },
  ]},
  { id: 'income', title: '4) How stable is your income and liquidity?', options: [
    { value: 'unstable', label: 'Unstable income / low emergency buffer', score: 0 },
    { value: 'adequate', label: 'Stable income / 3–6 months buffer', score: 1 },
    { value: 'strong', label: 'Very stable income / 6+ months buffer', score: 2 },
  ]},
  { id: 'preference', title: '5) Which risk/return profile sounds best to you?', options: [
    { value: 'low', label: 'Lower risk, lower returns', score: 0 },
    { value: 'balanced', label: 'Balanced risk & return', score: 1 },
    { value: 'high', label: 'Higher risk, higher returns', score: 2 },
  ]},
];

function scoreToBand(total) {
  if (total <= 2) return 'CONSERVATIVE';
  if (total <= 5) return 'MODERATE';
  if (total <= 8) return 'MODERATE_AGGRESSIVE';
  return 'AGGRESSIVE';
}
const BAND_LABEL = {
  CONSERVATIVE: 'Conservative',
  MODERATE: 'Moderate',
  MODERATE_AGGRESSIVE: 'Moderate Aggressive',
  AGGRESSIVE: 'Aggressive',
};

const MODEL_ORDER = ['CONSERVATIVE', 'MODERATE', 'MODERATE_AGGRESSIVE', 'AGGRESSIVE'];
const MODEL_RETURNS = { CONSERVATIVE: 0.03, MODERATE: 0.05, MODERATE_AGGRESSIVE: 0.07, AGGRESSIVE: 0.09 };
const MODEL_INSTRUMENTS = {
  CONSERVATIVE: [
    { name: 'Global Bond Fund A', weight: '60%', factsheet: '#', prospectus: '#' },
    { name: 'Short-Term Gov Bond B', weight: '40%', factsheet: '#', prospectus: '#' },
  ],
  MODERATE: [
    { name: 'Global Equity ETF C', weight: '40%', factsheet: '#', prospectus: '#' },
    { name: 'Global Bond Fund A', weight: '60%', factsheet: '#', prospectus: '#' },
  ],
  MODERATE_AGGRESSIVE: [
    { name: 'Global Equity ETF C', weight: '70%', factsheet: '#', prospectus: '#' },
    { name: 'EM Equity ETF D', weight: '30%', factsheet: '#', prospectus: '#' },
  ],
  AGGRESSIVE: [
    { name: 'Global Equity ETF C', weight: '60%', factsheet: '#', prospectus: '#' },
    { name: 'EM Equity ETF D', weight: '40%', factsheet: '#', prospectus: '#' },
  ],
};

const FREQ = { MONTHLY: { periodsPerYear: 12 }, QUARTERLY: { periodsPerYear: 4 }, 'SEMI-ANNUALLY': { periodsPerYear: 2 } };

const fmt = new Intl.NumberFormat('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const toCurrencyString = (n) => (Number.isFinite(n) ? fmt.format(n) : '');
const parseCurrencyString = (s) => Number(String(s || '').replace(/[^0-9.]/g, '')) || 0;
function bindMoney(value, setter) {
  return {
    value,
    onChange: (e) => setter(e.target.value.replace(/[^\d.]/g, '')),
    onBlur: (e) => setter(toCurrencyString(parseCurrencyString(e.target.value))),
    onFocus: (e) => {
      const n = parseCurrencyString(e.target.value);
      setter(n ? String(n) : '');
      setTimeout(() => e.target.setSelectionRange(e.target.value.length, e.target.value.length), 0);
    },
    inputMode: 'decimal',
  };
}

function perPeriodRate(annualReturn, n) { return Math.pow(1 + annualReturn, 1 / n) - 1; }
function fvSeries({ initial, P, r, N }) {
  let v = initial;
  const s = [v];
  for (let i = 0; i < N; i++) { v = v * (1 + r) + P; s.push(v); }
  return s;
}
const fvClosed = (I, P, r, N) => I * Math.pow(1 + r, N) + P * ((Math.pow(1 + r, N) - 1) / r);

function solveRecurringForTarget(T, I, r, N) {
  const A = Math.pow(1 + r, N);
  const denom = (A - 1) / r;
  const P = (T - I * A) / denom;
  return Math.max(0, P);
}
function solveInitialForTarget(T, P, r, N) {
  const A = Math.pow(1 + r, N);
  const I = (T - P * ((A - 1) / r)) / A;
  return Math.max(0, I);
}
function solvePeriodsForTarget(T, I, P, r) {
  const A = (T + P / r) / (I + P / r);
  if (A <= 1) return 0;
  return Math.log(A) / Math.log(1 + r);
}

export default function OCBCOnboardingFlow() {
  const [step, setStep] = useState(1);

  useEffect(() => {
    const handleEnd = () => localStorage.removeItem('ocbc_portfolios');
    window.addEventListener('beforeunload', handleEnd);
    return () => window.removeEventListener('beforeunload', handleEnd);
  }, []);

  const [answers, setAnswers] = useState({});
  const totalScore = useMemo(
    () => QUESTIONS.reduce((acc, q) => {
      const a = answers[q.id];
      const opt = q.options.find(o => o.value === a);
      return acc + (opt?.score ?? 0);
    }, 0),
    [answers]
  );
  const riskBand = scoreToBand(totalScore);

  const [selectedModel, setSelectedModel] = useState(null);
  const [needConsent, setNeedConsent] = useState(false);
  const [consented, setConsented] = useState(false);

  const [linkGoal, setLinkGoal] = useState(null);
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [tenorYears, setTenorYears] = useState('5');
  const [initialInvestment, setInitialInvestment] = useState('');
  const [recFreq, setRecFreq] = useState('MONTHLY');
  const [recAmount, setRecAmount] = useState('');

  const [ngInitial, setNgInitial] = useState('');
  const [ngFreq, setNgFreq] = useState('MONTHLY');
  const [ngAmount, setNgAmount] = useState('');

  const [finalConsent, setFinalConsent] = useState(false);
  const [pin, setPin] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // ✅ FIXED: removed stray "the"
  const [optChoice, setOptChoice] = useState('recurring'); // 'initial' | 'recurring' | 'tenor'

  const canContinueQs = QUESTIONS.every(q => !!answers[q.id]);
  const chosenAnnual = selectedModel ? MODEL_RETURNS[selectedModel] : 0.05;

  const nGoal = Math.max(1, FREQ[recFreq]?.periodsPerYear ?? 12);
  const rGoal = perPeriodRate(chosenAnnual, nGoal);
  const NGoal = Math.round((Number(tenorYears || 0)) * nGoal);
  const IGoal = parseCurrencyString(initialInvestment);
  const PGoal = parseCurrencyString(recAmount);

  const nNG = Math.max(1, FREQ[ngFreq]?.periodsPerYear ?? 12);
  const rNG = perPeriodRate(chosenAnnual, nNG);
  const NNG = 5 * nNG;
  const ING = parseCurrencyString(ngInitial);
  const PNG = parseCurrencyString(ngAmount);

  const goalSeries = useMemo(
    () => (selectedModel && linkGoal ? fvSeries({ initial: IGoal, P: PGoal, r: rGoal, N: NGoal }) : null),
    [selectedModel, linkGoal, IGoal, PGoal, rGoal, NGoal]
  );
  const goalProjection = useMemo(() => (goalSeries ? Math.round(goalSeries[goalSeries.length - 1]) : null), [goalSeries]);

  const noGoalSeries = useMemo(
    () => (selectedModel && linkGoal === false ? fvSeries({ initial: ING, P: PNG, r: rNG, N: NNG }) : null),
    [selectedModel, linkGoal, ING, PNG, rNG, NNG]
  );
  const noGoalProjection = useMemo(() => (noGoalSeries ? Math.round(noGoalSeries[noGoalSeries.length - 1]) : null), [noGoalSeries]);

  const targetReachable = useMemo(() => {
    if (!goalProjection || !targetAmount) return null;
    return goalProjection >= parseCurrencyString(targetAmount);
  }, [goalProjection, targetAmount]);

  function handleModelClick(key) {
    const idx = MODEL_ORDER.indexOf(key);
    const idxRisk = MODEL_ORDER.indexOf(riskBand);
    const upgrade = idx > idxRisk;
    setSelectedModel(key);
    setNeedConsent(upgrade);
    setConsented(!upgrade);
  }

  function perPeriodRate(annualReturn, n) { return Math.pow(1 + annualReturn, 1 / n) - 1; }

  function applyOptimization() {
    if (linkGoal !== true) return;
    const T = parseCurrencyString(targetAmount);
    if (!T || !selectedModel) return;

    if (optChoice === 'recurring') {
      const P = solveRecurringForTarget(T, IGoal, rGoal, NGoal);
      setRecAmount(toCurrencyString(Math.ceil(P)));
      return;
    }
    if (optChoice === 'initial') {
      const I = solveInitialForTarget(T, PGoal, rGoal, NGoal);
      setInitialInvestment(toCurrencyString(Math.ceil(I)));
      return;
    }
    if (optChoice === 'tenor') {
      let N = Math.ceil(solvePeriodsForTarget(T, IGoal, PGoal, rGoal));
      N = Math.max(NGoal, N);
      const years = Math.max(1, Math.ceil(N / nGoal));
      setTenorYears(String(years));
      return;
    }
  }

  useEffect(() => {
    if (step === 6 && pin && pin.length >= 4 && pin.length <= 6) {
      setSubmitted(true);
    }
  }, [step, pin]);

  function savePortfolioAndBack() {
    const ytd = Math.round((MODEL_RETURNS[selectedModel] * 100 * 0.75) * 10) / 10;
    const latest = linkGoal ? (goalProjection || 0) : (noGoalProjection || 0);

    const card = {
      name: linkGoal ? (goalName?.trim() ? `Goal – ${goalName.trim()}` : `Goal – ${BAND_LABEL[selectedModel]}`) :
                       `Portfolio – ${BAND_LABEL[selectedModel]}`,
      inception: new Date().toLocaleDateString('en-SG', { month: 'short', day: 'numeric', year: 'numeric' }),
      latest: toCurrencyString(latest),
      ytd,
      tone:
        selectedModel === 'CONSERVATIVE' ? 'conservative'
        : selectedModel === 'MODERATE' ? 'balanced'
        : 'moderate',
    };

    const key = 'ocbc_portfolios';
    try {
      const prev = JSON.parse(localStorage.getItem(key) || '[]');
      prev.unshift(card);
      localStorage.setItem(key, JSON.stringify(prev));
    } catch {
      localStorage.setItem(key, JSON.stringify([card]));
    }

    window.location.hash = '';
  }

  return (
    <div className="min-h-screen" style={ocbcBgStyle}>
      <div className="bg-white border-b">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center gap-3">
          <div className="h-8 w-8 rounded-md" style={{ background: OCBC_RED }} />
          <div className="text-lg font-semibold">OCBC Onboarding</div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8 space-y-6">
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Risk Profiling</CardTitle>
              <CardDescription>Answer 5 questions to determine your risk profile.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {QUESTIONS.map(q => (
                <div key={q.id} className="space-y-2">
                  <Label className="font-medium">{q.title}</Label>
                  <RadioGroup
                    value={answers[q.id] || ''}
                    onValueChange={(v) => setAnswers(prev => ({ ...prev, [q.id]: v }))}
                  >
                    {q.options.map(o => (
                      <RadioGroupItem key={o.value} value={o.value}>{o.label}</RadioGroupItem>
                    ))}
                  </RadioGroup>
                </div>
              ))}
              <div className="flex justify-end">
                <Button onClick={() => setStep(2)} disabled={!canContinueQs}>Continue</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Your Risk Profile Result</CardTitle>
              <CardDescription>Suggested profile: <strong>{BAND_LABEL[riskBand]}</strong></CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="font-medium">Choose a Model Portfolio</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  {MODEL_ORDER.map(key => (
                    <button
                      key={key}
                      onClick={() => handleModelClick(key)}
                      className={[
                        'text-left rounded-lg border p-4 hover:bg-gray-50 transition',
                        selectedModel === key ? 'border-[var(--ocbc-red,#d71920)]' : 'border-gray-200'
                      ].join(' ')}
                    >
                      <div className="font-semibold">{BAND_LABEL[key]}</div>
                      <div className="text-xs text-gray-500">Expected return (illustrative): {(MODEL_RETURNS[key] * 100).toFixed(1)}% p.a.</div>
                      {key === riskBand && <div className="text-xs text-green-600 mt-1">Recommended</div>}
                      {MODEL_ORDER.indexOf(key) > MODEL_ORDER.indexOf(riskBand) && <div className="text-xs text-amber-700 mt-1">Above your risk result</div>}
                    </button>
                  ))}
                </div>
              </div>

              {needConsent && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
                  <div className="font-semibold mb-1">Consent required</div>
                  <div className="text-sm text-amber-800">
                    You selected a model above your risk profile result. Check the box below to acknowledge
                    the increased risk and continue.
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <input
                      id="modelConsent"
                      type="checkbox"
                      className="h-4 w-4 accent-[var(--ocbc-red,#d71920)]"
                      checked={consented}
                      onChange={(e) => setConsented(e.target.checked)}
                    />
                    <Label htmlFor="modelConsent">I understand & consent</Label>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={() => setStep(3)} disabled={!selectedModel || (needConsent && !consented)}>Continue</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Model Portfolio Details</CardTitle>
              <CardDescription>Instruments included in: <strong>{BAND_LABEL[selectedModel]}</strong></CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border border-gray-200 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left p-3">Instrument</th>
                      <th className="text-left p-3">Weight</th>
                      <th className="text-left p-3">Fund Factsheet</th>
                      <th className="text-left p-3">Prospectus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MODEL_INSTRUMENTS[selectedModel]?.map((ins, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-3">{ins.name}</td>
                        <td className="p-3">{ins.weight}</td>
                        <td className="p-3"><a className="underline" href={ins.factsheet} target="_blank" rel="noreferrer">Open</a></td>
                        <td className="p-3"><a className="underline" href={ins.prospectus} target="_blank" rel="noreferrer">Open</a></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                <Button onClick={() => setStep(4)}>Continue</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Link to a Goal (Optional)</CardTitle>
              <CardDescription>Set a target and we’ll show the projection against your selected model.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {linkGoal === null && (
                <div className="flex gap-3">
                  <Button onClick={() => setLinkGoal(true)}>Yes, link a goal</Button>
                  <Button variant="outline" onClick={() => setLinkGoal(false)}>Skip goal setup</Button>
                </div>
              )}

              {linkGoal === true && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label>Goal Name</Label>
                      <Input value={goalName} onChange={(e)=>setGoalName(e.target.value)} placeholder="e.g. Education Fund for Emma" />
                    </div>
                    <div>
                      <Label>Target Amount (SGD)</Label>
                      <Input {...bindMoney(targetAmount, setTargetAmount)} placeholder="e.g. 100,000.00" />
                    </div>
                    <div>
                      <Label>Tenor (years)</Label>
                      <Input inputMode="numeric" value={tenorYears} onChange={e => setTenorYears(e.target.value.replace(/[^\d]/g, ''))} placeholder="e.g. 5" />
                    </div>
                    <div>
                      <Label>Initial Investment (SGD)</Label>
                      <Input {...bindMoney(initialInvestment, setInitialInvestment)} placeholder="e.g. 10,000.00" />
                    </div>
                    <div>
                      <Label>Recurring Contribution</Label>
                      <Select value={recFreq} onValueChange={setRecFreq}>
                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                        <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                        <SelectItem value="SEMI-ANNUALLY">Semi-annually</SelectItem>
                      </Select>
                    </div>
                    <div>
                      <Label>Recurring Amount (SGD)</Label>
                      <Input {...bindMoney(recAmount, setRecAmount)} placeholder="e.g. 500.00" />
                    </div>
                  </div>

                  <ProjectionPanel
                    series={goalSeries}
                    label="Projection"
                    target={parseCurrencyString(targetAmount) || undefined}
                  />

                  <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                    <div className="text-sm text-gray-600 mb-1">Projected Value (illustrative)</div>
                    <div className="text-2xl font-semibold">SGD {goalProjection?.toLocaleString() ?? '—'}</div>

                    {targetAmount && targetReachable === false && (
                      <div className="text-sm text-amber-700 mt-2">Your target may not be reachable within these parameters.</div>
                    )}

                    {targetAmount && targetReachable === false && (
                      <div className="mt-3 space-y-3">
                        <div className="text-sm font-medium">Optimize by:</div>
                        <div className="flex flex-wrap gap-2">
                          <button className={chip(optChoice === 'initial')} onClick={() => setOptChoice('initial')}>Increase Initial</button>
                          <button className={chip(optChoice === 'recurring')} onClick={() => setOptChoice('recurring')}>Increase Recurring</button>
                          <button className={chip(optChoice === 'tenor')} onClick={() => setOptChoice('tenor')}>Increase Tenor</button>
                        </div>
                        <Button variant="outline" onClick={applyOptimization}>Apply Optimization</Button>
                      </div>
                    )}

                    <div className="mt-3">
                      <Button onClick={() => setStep(5)}>Continue</Button>
                    </div>
                  </div>
                </>
              )}

              {linkGoal === false && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Initial Investment (SGD)</Label>
                      <Input {...bindMoney(ngInitial, setNgInitial)} placeholder="e.g. 10,000.00" />
                    </div>
                    <div>
                      <Label>Recurring Contribution</Label>
                      <Select value={ngFreq} onValueChange={setNgFreq}>
                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                        <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                        <SelectItem value="SEMI-ANNUALLY">Semi-annually</SelectItem>
                      </Select>
                    </div>
                    <div>
                      <Label>Recurring Amount (SGD)</Label>
                      <Input {...bindMoney(ngAmount, setNgAmount)} placeholder="e.g. 500.00" />
                    </div>
                  </div>

                  <ProjectionPanel series={noGoalSeries} label="Projection (5 years)" />

                  <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                    <div className="text-sm text-gray-600 mb-1">Projected Value (illustrative)</div>
                    <div className="text-2xl font-semibold">SGD {noGoalProjection?.toLocaleString() ?? '—'}</div>
                    <div className="mt-3">
                      <Button onClick={() => setStep(5)}>Continue</Button>
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 5 && (
          <Card>
            <CardHeader>
              <CardTitle>Customer Consent Acknowledgement</CardTitle>
              <CardDescription>Please review and acknowledge before proceeding.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-gray-600">
                By continuing, you consent to the selected model portfolio and understand the risks associated
                with market investments. Projections shown are illustrative and not guaranteed.
              </p>

              <label className="flex items-center gap-3 select-none cursor-pointer">
                <input
                  id="finalConsent"
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--ocbc-red,#d71920)]"
                  checked={finalConsent}
                  onChange={(e) => setFinalConsent(e.target.checked)}
                />
                <span className="text-[15px]">I acknowledge and consent</span>
              </label>

              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(4)}>Back</Button>
                <Button onClick={() => setStep(6)} disabled={!finalConsent}>Continue</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 6 && !submitted && (
          <Card>
            <CardHeader>
              <CardTitle>Enter PIN</CardTitle>
              <CardDescription>Set a 4–6 digit PIN to confirm. Advances automatically once valid.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-xs">
                <Label>PIN</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  pattern="\d*"
                  placeholder="e.g. 1234"
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">Any 4–6 digits accepted (demo).</p>
              </div>
              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => setStep(5)}>Back</Button>
                <Button disabled>Waiting for valid PIN…</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {submitted && (
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
              <CardDescription>Here’s a recap of your selection and plan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-gray-200 p-4 bg-white">
                <ul className="text-sm leading-7">
                  <li><span className="text-gray-500">Risk Result:</span> <strong>{BAND_LABEL[riskBand]}</strong></li>
                  <li><span className="text-gray-500">Selected Model:</span> <strong>{BAND_LABEL[selectedModel]}</strong></li>
                  {linkGoal ? (
                    <>
                      {goalName?.trim() && <li><span className="text-gray-500">Goal Name:</span> <strong>{goalName.trim()}</strong></li>}
                      <li><span className="text-gray-500">Target:</span> <strong>SGD {toCurrencyString(parseCurrencyString(targetAmount))}</strong></li>
                      <li><span className="text-gray-500">Tenor:</span> <strong>{tenorYears} years</strong></li>
                      <li><span className="text-gray-500">Initial:</span> <strong>SGD {toCurrencyString(parseCurrencyString(initialInvestment))}</strong></li>
                      <li><span className="text-gray-500">Recurring:</span> <strong>{recFreq.replace('-', ' ')} — SGD {toCurrencyString(parseCurrencyString(recAmount))}</strong></li>
                      <li><span className="text-gray-500">Projection:</span> <strong>SGD {toCurrencyString(goalProjection || 0)}</strong></li>
                    </>
                  ) : (
                    <>
                      <li><span className="text-gray-500">Initial:</span> <strong>SGD {toCurrencyString(parseCurrencyString(ngInitial))}</strong></li>
                      <li><span className="text-gray-500">Recurring:</span> <strong>{ngFreq.replace('-', ' ')} — SGD {toCurrencyString(parseCurrencyString(ngAmount))}</strong></li>
                      <li><span className="text-gray-500">Projection (5Y):</span> <strong>SGD {toCurrencyString(noGoalProjection || 0)}</strong></li>
                    </>
                  )}
                </ul>
              </div>

              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => { setSubmitted(false); setStep(6); }}>Back</Button>
                <Button onClick={savePortfolioAndBack}>Back to Dashboard</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function chip(active) {
  return [
    'px-3 py-1 rounded-full border text-sm',
    active ? 'border-[var(--ocbc-red,#d71920)] text-[var(--ocbc-red,#d71920)] bg-white'
           : 'border-gray-300 text-gray-600 hover:bg-gray-50'
  ].join(' ');
}

function ProjectionPanel({ series, label, target }) {
  if (!series) return null;
  const w = 560, h = 160, padding = 10;
  const maxVal = Math.max(...series, target || 0, 1);
  const minVal = 0;

  const xStep = (w - padding * 2) / Math.max(1, series.length - 1);
  const y = (val) => {
    const ratio = (val - minVal) / (maxVal - minVal || 1);
    return h - padding - ratio * (h - padding * 2);
  };

  const pts = series.map((v, i) => `${padding + i * xStep},${y(v)}`).join(' ');
  const baselineY = y(0);
  const areaPts = [
    ...series.map((v, i) => `${padding + i * xStep},${y(v)}`),
    `${padding + (series.length - 1) * xStep},${baselineY}`,
    `${padding},${baselineY}`
  ].join(' ');

  return (
    <div className="rounded-lg border border-gray-200 p-4 bg-white">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-gray-600">{label}</div>
        <div className="flex items-center gap-4 text-xs">
          <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-[2px] bg-[#d71920]" /> Projection</span>
          {Number.isFinite(target) && <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-[2px] border-t border-dashed border-gray-500" /> Target</span>}
        </div>
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-40">
        <polygon points={areaPts} fill="rgba(215,25,32,0.08)" />
        <polyline fill="none" stroke="#d71920" strokeWidth="3" points={pts} strokeLinejoin="round" strokeLinecap="round" />
        {Number.isFinite(target) && (
          <line
            x1={padding}
            x2={w - padding}
            y1={y(target)}
            y2={y(target)}
            stroke="#6b7280"
            strokeDasharray="4 4"
            strokeWidth="1.5"
          />
        )}
        <line x1="0" y1={h-40} x2={w} y2={h-40} stroke="#e5e7eb" strokeDasharray="4 4" />
        <line x1="0" y1={h-80} x2={w} y2={h-80} stroke="#e5e7eb" strokeDasharray="4 4" />
      </svg>

      <div className="text-xs text-gray-500">
        Max value shown: SGD {Math.round(maxVal).toLocaleString()}
      </div>
    </div>
  );
}
