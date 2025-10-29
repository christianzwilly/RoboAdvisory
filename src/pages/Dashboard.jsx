// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card.jsx";
import { Switch } from "@/components/ui/Switch.jsx";

const SectionTitle = ({ children }) => <div className="text-lg font-semibold text-gray-800">{children}</div>;
const ActionChip = ({ children }) => (
  <button className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 transition">
    {children}
  </button>
);
const Badge = ({ tone = "default", children }) => {
  const map = {
    default: "bg-gray-100 text-gray-700 border border-gray-200",
    moderate: "bg-orange-50 text-orange-700 border border-orange-200",
    balanced: "bg-blue-50 text-blue-700 border border-blue-200",
    conservative: "bg-rose-50 text-rose-700 border border-rose-200",
  };
  return <span className={`text-xs px-2 py-1 rounded-full ${map[tone] || map.default}`}>{children}</span>;
};

// Subtle OCBC-red pattern + soft tint
const ocbcBgStyle = {
  backgroundImage:
    'radial-gradient(rgba(215,25,32,0.06) 1px, transparent 1px), radial-gradient(rgba(215,25,32,0.04) 1px, transparent 1px)',
  backgroundSize: '20px 20px, 40px 40px',
  backgroundPosition: '0 0, 10px 10px',
  backgroundColor: '#f8fafc',
};

// simple seeded PRNG (mulberry32) for mini charts
function mulberry32(seed) {
  return function() {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h >>> 0) || 1;
}

const MiniChart = ({ seed = "default" }) => {
  const rng = useMemo(() => mulberry32(hashString(seed)), [seed]);

  // 12 monthly points with drift + seeded volatility
  const data = useMemo(() => {
    let base = 100;
    const arr = [];
    for (let i = 0; i < 12; i++) {
      const drift = 0.7 + rng() * 0.6; // 0.7..1.3
      const vol = 1.8 + rng() * 2.2;   // 1.8..4.0
      const shock = (Math.sin(i * (0.6 + rng() * 0.5)) * vol) + ((rng() - 0.5) * vol);
      base = Math.max(88, base + drift + shock);
      arr.push({ x: i, value: base });
    }
    return arr;
  }, [rng]);

  const [hover, setHover] = useState(null);

  const W = 300, H = 120, P = 10;
  const xStep = (W - P * 2) / (data.length - 1);
  const minV = Math.min(...data.map(d => d.value));
  const maxV = Math.max(...data.map(d => d.value));
  const y = (v) => H - P - ((v - minV) / (maxV - minV || 1)) * (H - P * 2);
  const linePts = data.map((d, i) => `${P + i * xStep},${y(d.value)}`).join(" ");
  const areaPts = [
    ...data.map((d, i) => `${P + i * xStep},${y(d.value)}`),
    `${P + (data.length - 1) * xStep},${H - P}`,
    `${P},${H - P}`,
  ].join(" ");

  function onMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - P;
    const idx = Math.min(Math.max(Math.round(x / xStep), 0), data.length - 1);
    const xPx = P + idx * xStep;
    const yPx = y(data[idx].value);
    setHover({ xPx, yPx, index: idx, value: data[idx].value });
  }
  function onLeave() { setHover(null); }

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-28" onMouseMove={onMove} onMouseLeave={onLeave}>
        <rect x="0" y="0" width={W} height={H} fill="none" />
        <line x1="0" y1="85" x2={W} y2="85" stroke="#e5e7eb" strokeDasharray="4 4" />
        <line x1="0" y1="65" x2={W} y2="65" stroke="#e5e7eb" strokeDasharray="4 4" />
        <line x1="0" y1="45" x2={W} y2="45" stroke="#e5e7eb" strokeDasharray="4 4" />
        <polygon points={areaPts} fill="rgba(215,25,32,0.08)" />
        <polyline points={linePts} fill="none" stroke="#d71920" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {hover && (
          <>
            <line x1={hover.xPx} y1={P} x2={hover.xPx} y2={H - P} stroke="#d1d5db" strokeDasharray="3 3" />
            <circle cx={hover.xPx} cy={hover.yPx} r="3.5" fill="#d71920" />
          </>
        )}
      </svg>
      {hover && (
        <div
          className="absolute text-[11px] px-2 py-1 bg-white border border-gray-200 rounded shadow-sm pointer-events-none"
          style={{ left: Math.min(Math.max(hover.xPx - 20, 0), W - 60), top: Math.max(hover.yPx - 30, 0) }}
        >
          Month {hover.index + 1}<br />
          Value {hover.value.toFixed(2)}
        </div>
      )}
    </div>
  );
};

function InvestmentCard({ name, inception, latest, tone, ytd }) {
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-semibold">{name}</div>
            <div className="text-xs text-gray-500">Inception: {inception}</div>
          </div>
        <Badge tone={tone}>{tone[0].toUpperCase() + tone.slice(1)}</Badge>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white">
          <MiniChart seed={name} />
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">Latest Value</div>
          <div className="font-semibold">${latest}</div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-500">YTD</div>
          <div className={Number(ytd) >= 0 ? 'text-green-600 font-medium' : 'text-rose-600 font-medium'}>
            {typeof ytd === 'number' ? `${ytd.toFixed(1)}%` : (ytd || '—')}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [newCards, setNewCards] = useState([]);

  useEffect(() => {
    try {
      const x = JSON.parse(localStorage.getItem('ocbc_portfolios') || '[]');
      setNewCards(Array.isArray(x) ? x : []);
    } catch {
      setNewCards([]);
    }
  }, []);

  // Clear demo portfolios after tab/window is closed
  useEffect(() => {
    const handleEnd = () => localStorage.removeItem('ocbc_portfolios');
    window.addEventListener('beforeunload', handleEnd);
    return () => window.removeEventListener('beforeunload', handleEnd);
  }, []);

  // Helper: navigate to onboarding and force re-render if hash didn't change
  function goToOnboarding() {
    const target = "#/onboarding";
    if (window.location.hash === target) {
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    } else {
      window.location.hash = target;
    }
  }

  return (
    <div className="min-h-screen" style={ocbcBgStyle}>
      {/* Header */}
      <div className="bg-white border-b">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md" style={{ background: "var(--ocbc-red, #d71920)" }} />
            <div className="font-semibold text-lg">OCBC Wealth</div>
          </div>
          <div className="flex items-center gap-4">
            <button
              className="inline-flex items-center gap-2 rounded-md bg-[var(--ocbc-red,#d71920)] text-white px-4 py-2 text-sm"
              onClick={goToOnboarding}
            >
              + Add Investment
            </button>
            <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
              <span>Website</span>
              <Switch checked={false} onCheckedChange={() => {}} />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-6 py-6 space-y-6">
        {/* Active Account */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
              <div className="space-y-1">
                <div className="text-sm text-gray-500">Active Account</div>
                <div className="text-gray-600 text-sm">OCBC 360 Account · 123-456-789</div>
                <div className="text-3xl font-semibold">$25,341</div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <ActionChip>Transfer</ActionChip>
                <ActionChip>Pay Bills</ActionChip>
                <ActionChip>Top Up</ActionChip>
                <ActionChip>Cards</ActionChip>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Promotions */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <SectionTitle>Promotions</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card><CardContent className="p-5 space-y-2"><div className="font-semibold">Earn up to 4.0% p.a.</div><div className="text-sm text-gray-500">Top up to savings goals and enjoy bonus interest.</div><button className="border border-gray-300 rounded-md px-3 py-2 text-sm hover:bg-gray-50">Learn more</button></CardContent></Card>
              <Card><CardContent className="p-5 space-y-2"><div className="font-semibold">0% FX Fees this month</div><div className="text-sm text-gray-500">Use your OCBC Card for overseas spend.</div><button className="border border-gray-300 rounded-md px-3 py-2 text-sm hover:bg-gray-50">Activate</button></CardContent></Card>
              <Card><CardContent className="p-5 space-y-2"><div className="font-semibold">Refer & Earn</div><div className="text-sm text-gray-500">Invite friends to OCBC Wealth and get rewards.</div><button className="border border-gray-300 rounded-md px-3 py-2 text-sm hover:bg-gray-50">Refer now</button></CardContent></Card>
            </div>
          </CardContent>
        </Card>

        {/* Your Investments */}
        <div className="flex items-center justify-between">
          <SectionTitle>Your Investments</SectionTitle>
          <button
            className="border border-gray-300 rounded-md px-3 py-2 text-sm hover:bg-gray-50"
            onClick={goToOnboarding}
          >
            + Add Investment
          </button>
        </div>

        {/* Recently added */}
        {newCards.length > 0 && (
          <>
            <div className="text-xs text-gray-500">Recently added</div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {newCards.map((c, i) => (
                <InvestmentCard
                  key={`new-${i}`}
                  name={c.name}
                  inception={c.inception}
                  latest={c.latest}
                  tone={c.tone}
                  ytd={c.ytd}
                />
              ))}
            </div>
          </>
        )}

        {/* Seeded demo portfolios */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-2">
          <InvestmentCard name="Education Fund" inception="Jan 1, 2025" latest="100,134" tone="moderate" ytd={4.2} />
          <InvestmentCard name="Retirement" inception="Jun 15, 2024" latest="291,831" tone="balanced" ytd={6.1} />
          <InvestmentCard name="Emergency Reserve" inception="Jun 30, 2025" latest="29,658" tone="conservative" ytd={1.3} />
        </div>

        <div className="text-center text-xs text-gray-500 py-6">
          Use “Add Investment” to open the onboarding flow. OCBC branding & colors applied.
        </div>
      </div>
    </div>
  );
}
