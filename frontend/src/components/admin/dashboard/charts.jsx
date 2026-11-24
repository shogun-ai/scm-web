import { useId, useMemo, useState } from 'react';
import { monotonePath, niceMax } from './dashboardData';
import { useCountUp } from '../theme/hooks';

const W = 1000;
const fmtShort = date => `${date.getMonth() + 1}/${date.getDate()}`;
const WEEKDAYS = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];
const fmtLong = date => `${date.getMonth() + 1}-р сарын ${date.getDate()}, ${WEEKDAYS[date.getDay()]}`;

// ---------------------------------------------------------------------------
// Sparkline — tiny trend line for KPI cards
// ---------------------------------------------------------------------------
export function Sparkline({ values, color, height = 36 }) {
  const id = useId().replace(/:/g, '');
  const { line, area } = useMemo(() => {
    const max = Math.max(1, ...values);
    const step = values.length > 1 ? 100 / (values.length - 1) : 100;
    const points = values.map((value, index) => [index * step, 2 + (1 - value / max) * (height - 4)]);
    const path = monotonePath(points);
    return { line: path, area: path ? `${path}L100,${height}L0,${height}Z` : '' };
  }, [values, height]);
  return <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="adm-chart-reveal block h-9 w-full" aria-hidden="true">
    <defs>
      <linearGradient id={`spk-${id}`} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.32" />
        <stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient>
    </defs>
    <path d={area} fill={`url(#spk-${id})`} />
    <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
  </svg>;
}

// ---------------------------------------------------------------------------
// AreaChart — multi-series smooth area with crosshair + keyboard navigation
// ---------------------------------------------------------------------------
export function AreaChart({ series, dates, height = 240, label }) {
  const uid = useId().replace(/:/g, '');
  const [hover, setHover] = useState(null);
  const n = dates.length;
  const padTop = 14;
  const padBottom = 2;
  const max = niceMax(Math.max(0, ...series.flatMap(item => item.values)));
  const xFor = index => (n > 1 ? (index / (n - 1)) * W : W / 2);
  const yFor = value => padTop + (1 - value / max) * (height - padTop - padBottom);

  const paths = series.map(item => {
    const line = monotonePath(item.values.map((value, index) => [xFor(index), yFor(value)]));
    return { ...item, line, area: line ? `${line}L${W},${height}L0,${height}Z` : '' };
  });

  const ticks = [0, 0.5, 1];
  const xTicks = n > 1 ? [0, Math.round((n - 1) / 3), Math.round((2 * (n - 1)) / 3), n - 1] : [0];

  const pick = clientX => (rect => Math.max(0, Math.min(n - 1, Math.round(((clientX - rect.left) / rect.width) * (n - 1)))));
  const onMove = event => setHover(pick(event.clientX)(event.currentTarget.getBoundingClientRect()));
  const onKey = event => {
    if (event.key === 'ArrowRight') { event.preventDefault(); setHover(value => Math.min(n - 1, (value ?? n - 1) + 1)); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); setHover(value => Math.max(0, (value ?? n - 1) - 1)); }
    if (event.key === 'Escape') setHover(null);
  };
  const hoverPct = hover != null ? (xFor(hover) / W) * 100 : 0;
  const totals = series.map(item => item.values.reduce((sum, value) => sum + value, 0));

  return <div className="relative">
    <div className="relative flex">
      <div className="relative w-8 shrink-0 text-[11px] text-[var(--adm-ink-3)] adm-tnum" style={{ height }} aria-hidden="true">
        {ticks.map(tick => <span key={tick} className="absolute right-2 -translate-y-1/2" style={{ top: `${(yFor(max * (1 - tick)) / height) * 100}%` }}>{Math.round(max * (1 - tick))}</span>)}
      </div>
      <div className="relative flex-1" style={{ height }}>
        {ticks.map(tick => <span key={tick} aria-hidden="true" className="absolute inset-x-0 border-t border-dashed border-white/[0.07]" style={{ top: `${(yFor(max * (1 - tick)) / height) * 100}%` }} />)}
        <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className="adm-chart-reveal absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
          <defs>
            {paths.map(item => <linearGradient key={`f-${item.id}`} id={`af-${uid}-${item.id}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={item.colors[1] || item.colors[0]} stopOpacity="0.30" />
              <stop offset="100%" stopColor={item.colors[1] || item.colors[0]} stopOpacity="0" />
            </linearGradient>)}
            {paths.map(item => <linearGradient key={`s-${item.id}`} id={`as-${uid}-${item.id}`} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor={item.colors[0]} />
              <stop offset="100%" stopColor={item.colors[1] || item.colors[0]} />
            </linearGradient>)}
          </defs>
          {paths.map(item => <g key={item.id}>
            <path d={item.area} fill={`url(#af-${uid}-${item.id})`} />
            <path d={item.line} fill="none" stroke={`url(#as-${uid}-${item.id})`} strokeWidth="7" strokeOpacity="0.12" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
            <path d={item.line} fill="none" stroke={`url(#as-${uid}-${item.id})`} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
          </g>)}
        </svg>

        {hover != null && <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-px bg-gradient-to-b from-white/0 via-white/40 to-white/0" style={{ left: `${hoverPct}%` }} />}
        {hover != null && paths.map(item => <span key={item.id} aria-hidden="true" className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-[#0B0F1E]" style={{ left: `${hoverPct}%`, top: `${(yFor(item.values[hover]) / height) * 100}%`, background: item.colors[1] || item.colors[0], boxShadow: `0 0 12px ${item.colors[1] || item.colors[0]}` }} />)}
        {hover != null && <div role="status" className="glass-strong pointer-events-none absolute top-1 z-10 min-w-[10rem] rounded-xl px-3 py-2.5 text-xs shadow-xl" style={{ left: `${hoverPct}%`, transform: `translateX(${hoverPct > 60 ? 'calc(-100% - 12px)' : '12px'})` }}>
          <p className="mb-1.5 font-semibold text-white">{fmtLong(dates[hover])}</p>
          {paths.map(item => <p key={item.id} className="flex items-center justify-between gap-4 text-[var(--adm-ink-2)]">
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: item.colors[1] || item.colors[0] }} />{item.label}</span>
            <span className="adm-tnum font-bold text-white">{item.values[hover]}</span>
          </p>)}
        </div>}

        <div
          className="absolute inset-0 cursor-crosshair rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
          tabIndex={0}
          role="img"
          aria-label={`${label}. ${series.map((item, index) => `${item.label}: нийт ${totals[index]}`).join(', ')}. Сум товчоор өдөр сонгоно.`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          onKeyDown={onKey}
          onBlur={() => setHover(null)}
        />
      </div>
    </div>
    <div className="relative ml-8 mt-2 h-4 text-[11px] text-[var(--adm-ink-3)] adm-tnum" aria-hidden="true">
      {xTicks.map((index, position) => <span key={index} className="absolute" style={{ left: `${(xFor(index) / W) * 100}%`, transform: position === 0 ? 'none' : position === xTicks.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)' }}>{dates[index] ? fmtShort(dates[index]) : ''}</span>)}
    </div>
  </div>;
}

// ---------------------------------------------------------------------------
// Donut — segment share with legend
// ---------------------------------------------------------------------------
export function Donut({ segments, centerLabel = 'нийт' }) {
  const [active, setActive] = useState(null);
  const total = segments.reduce((sum, item) => sum + item.value, 0);
  const shown = useCountUp(total);
  const size = 164;
  const stroke = 13;
  const r = (size - stroke) / 2 - 4;
  const c = 2 * Math.PI * r;
  const gap = segments.filter(item => item.value > 0).length > 1 ? 4 : 0;
  const lengths = segments.map(item => (total ? (item.value / total) * c : 0));
  const arcs = segments.map((item, index) => ({
    ...item,
    index,
    dash: Math.max(0, lengths[index] - gap),
    offset: lengths.slice(0, index).reduce((sum, length) => sum + length, 0),
  }));
  const focus = active != null ? segments[active] : null;

  return <div className="flex flex-col items-center gap-5 sm:flex-row lg:flex-col">
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90" role="img" aria-label={`Бүтээгдэхүүний бүтэц: ${segments.map(item => `${item.label} ${item.value}`).join(', ') || 'өгөгдөлгүй'}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        {arcs.map(arc => arc.dash > 0 && <circle
          key={arc.key}
          className="adm-donut-seg"
          style={{ '--i': arc.index, opacity: active == null || active === arc.index ? 1 : 0.28 }}
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={arc.color}
          strokeWidth={active === arc.index ? stroke + 4 : stroke}
          strokeDasharray={`${arc.dash} ${c - arc.dash}`}
          strokeDashoffset={-arc.offset}
          onPointerEnter={() => setActive(arc.index)}
          onPointerLeave={() => setActive(null)}
        />)}
      </svg>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="adm-tnum text-3xl font-bold tracking-tight text-white">{focus ? focus.value : shown}</p>
          <p className="mt-0.5 max-w-[7.5rem] truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--adm-ink-3)]">{focus ? focus.label : centerLabel}</p>
        </div>
      </div>
    </div>
    <ul className="w-full min-w-0 space-y-1">
      {segments.length === 0 && <li className="text-sm text-[var(--adm-ink-3)]">Өгөгдөл хараахан алга.</li>}
      {segments.map((item, index) => <li key={item.key}
        onPointerEnter={() => setActive(index)}
        onPointerLeave={() => setActive(null)}
        className={`flex items-center gap-3 rounded-lg px-2 py-1.5 text-[13px] transition-colors ${active === index ? 'bg-white/[0.06]' : ''}`}>
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: item.color, boxShadow: `0 0 10px ${item.color}80` }} aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-[var(--adm-ink-2)]">{item.label}</span>
        <span className="adm-tnum font-semibold text-white">{item.value}</span>
        <span className="adm-tnum w-10 text-right text-[var(--adm-ink-3)]">{total ? Math.round((item.value / total) * 100) : 0}%</span>
      </li>)}
    </ul>
  </div>;
}

// ---------------------------------------------------------------------------
// Gauge — 270° progress arc
// ---------------------------------------------------------------------------
export function Gauge({ value, from, to, label }) {
  const id = useId().replace(/:/g, '');
  const shown = useCountUp(value);
  const size = 168;
  const stroke = 12;
  const r = (size - stroke) / 2 - 2;
  const c = 2 * Math.PI * r;
  const arc = c * 0.75;
  const fill = arc * Math.max(0, Math.min(100, value)) / 100;
  return <div className="relative mx-auto" style={{ width: size, height: size }}>
    <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full rotate-[135deg]" role="img" aria-label={`${label}: ${value}%`}>
      <defs>
        <linearGradient id={`g-${id}`} x1="0" x2="1" y1="1" y2="0">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${arc} ${c}`} />
      {fill > 0 && <circle className="adm-donut-seg" cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#g-${id})`} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${fill} ${c}`} style={{ filter: `drop-shadow(0 0 6px ${to}66)` }} />}
    </svg>
    <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
      <div>
        <p className="adm-tnum text-4xl font-bold tracking-tight text-white">{shown}<span className="text-xl text-[var(--adm-ink-3)]">%</span></p>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--adm-ink-3)]">{label}</p>
      </div>
    </div>
  </div>;
}

// ---------------------------------------------------------------------------
// StackedBar — pipeline distribution
// ---------------------------------------------------------------------------
export function StackedBar({ segments }) {
  const total = segments.reduce((sum, item) => sum + item.value, 0);
  return <div>
    <div className="adm-bar-grow flex h-3 w-full gap-[3px] overflow-hidden rounded-full bg-white/[0.05]" role="img" aria-label={segments.map(item => `${item.label} ${item.value}`).join(', ')}>
      {total > 0 && segments.filter(item => item.value > 0).map(item => <span key={item.key} className="h-full first:rounded-l-full last:rounded-r-full" style={{ flexGrow: item.value, background: `linear-gradient(180deg, ${item.color}, ${item.color}B3)`, boxShadow: `0 0 12px ${item.color}55` }} />)}
    </div>
    <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 xl:grid-cols-6">
      {segments.map(item => <li key={item.key} className="min-w-0">
        <p className="flex items-center gap-2 truncate text-[12px] text-[var(--adm-ink-3)]"><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.color }} aria-hidden="true" />{item.label}</p>
        <p className="adm-tnum mt-0.5 text-lg font-bold text-white">{item.value}</p>
      </li>)}
    </ul>
  </div>;
}
