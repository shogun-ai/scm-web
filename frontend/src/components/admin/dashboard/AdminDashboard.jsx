import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, CheckCircle2, ClipboardList, Handshake, Hourglass, Inbox, Minus, Paperclip, UserCheck, UserX } from 'lucide-react';
import { TASK_STATUSES, TASK_STATUS_LABELS } from '@shared/loanTaskStatus';
import GlassCard from '../theme/GlassCard';
import { SPECTRUM } from '../theme/spectrum';
import { useCountUp } from '../theme/hooks';
import { fetchDashboardStats, fetchTaskSummary } from '../../loanTask/api';
import { AreaChart, Donut, Gauge, Sparkline, StackedBar } from './charts';
import { dailySeries, greeting, isPending, isResolved, isUsableStats, loanKpis, productMix, recentActivity, resolutionRate, seriesDelta, statsChannels, statsProductMix, statsSeries, weekDelta } from './dashboardData';

const PRODUCT_HUES = ['indigo', 'cyan', 'green', 'gold', 'amber', 'rose', 'violet'];
const STATUS_HUES = { new: 'cyan', assigned: 'indigo', additional_docs: 'gold', in_review: 'violet', rejected: 'rose', resolved: 'green' };
const OTHER_COLOR = '#7C879B';
const CHANNEL_COLORS = { web: SPECTRUM.cyan, messenger: SPECTRUM.indigo, webchat: SPECTRUM.violet };

const relativeTime = (value, now) => {
  const minutes = Math.round((now - new Date(value).getTime()) / 60000);
  if (!Number.isFinite(minutes)) return '';
  if (minutes < 1) return 'дөнгөж сая';
  if (minutes < 60) return `${minutes} минутын өмнө`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} цагийн өмнө`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} өдрийн өмнө`;
  try { return new Date(value).toLocaleDateString('mn-MN'); } catch { return ''; }
};

function Delta({ diff }) {
  const Icon = diff > 0 ? ArrowUpRight : diff < 0 ? ArrowDownRight : Minus;
  return <span className="adm-tnum inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[11.5px] font-semibold text-[var(--adm-ink-2)]" title="Өмнөх 7 хоногтой харьцуулахад">
    <Icon size={13} aria-hidden="true" />
    {diff > 0 ? `+${diff}` : diff}
    <span className="sr-only"> — өмнөх 7 хоногтой харьцуулахад</span>
  </span>;
}

function KpiCard({ hue, icon, label, value, diff, spark, note, index, total }) {
  const Icon = icon;
  const shown = useCountUp(value);
  return <GlassCard hue={hue} glint className={`adm-rise p-4 sm:p-5 ${index === total - 1 && total % 2 === 1 ? 'col-span-2 sm:col-span-1' : ''}`} style={{ '--d': index + 1 }}>
    <div className="flex items-start justify-between gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${SPECTRUM[hue]}1F`, boxShadow: `inset 0 0 0 1px ${SPECTRUM[hue]}40`, color: SPECTRUM[hue] }}>
        <Icon size={19} strokeWidth={1.9} aria-hidden="true" />
      </span>
      {diff != null && <Delta diff={diff} />}
    </div>
    <p className="mt-5 text-[13px] font-semibold text-[var(--adm-ink-2)]">{label}</p>
    <p className="adm-tnum mt-1 text-[28px] font-bold leading-none tracking-tight text-white sm:text-[34px]">{shown}</p>
    {spark && <div className="mt-4 -mx-1"><Sparkline values={spark} color={SPECTRUM[hue]} /></div>}
    {spark && <p className="mt-1 text-[11px] text-[var(--adm-ink-3)]">Сүүлийн 14 хоног</p>}
    {note && <p className="mt-4 text-[11px] text-[var(--adm-ink-3)]">{note}</p>}
  </GlassCard>;
}

function CardHeader({ eyebrow, title, action }) {
  return <div className="mb-5 flex items-start justify-between gap-4">
    <div>
      <p className="adm-eyebrow">{eyebrow}</p>
      <h3 className="mt-1.5 text-[17px] font-bold tracking-tight text-white">{title}</h3>
    </div>
    {action}
  </div>;
}

function StatusPill({ resolved }) {
  return resolved
    ? <span className="shrink-0 rounded-full bg-[#34D399]/[0.12] px-2.5 py-1 text-[11.5px] font-semibold text-[#86EFC4] ring-1 ring-inset ring-[#34D399]/25">Шийдсэн</span>
    : <span className="shrink-0 rounded-full bg-[#F3CB55]/[0.12] px-2.5 py-1 text-[11.5px] font-semibold text-[#F7DC8A] ring-1 ring-inset ring-[#F3CB55]/25">Хүлээгдэж буй</span>;
}

export default function AdminDashboard({ user, requests = [], trusts = [], onboardingCount = 0, showOnboarding = false, loading = false, apiUrl, loanTasksEnabled = false, productNames = {}, onNavigate }) {
  const [now] = useState(() => new Date());
  const [summary, setSummary] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!loanTasksEnabled) return undefined;
    let cancelled = false;
    fetchTaskSummary(apiUrl, {})
      .then(data => { if (!cancelled && data?.counts && typeof data.counts === 'object') setSummary(data); })
      .catch(() => { /* pipeline card stays hidden without summary access */ });
    return () => { cancelled = true; };
  }, [apiUrl, loanTasksEnabled]);

  useEffect(() => {
    let cancelled = false;
    fetchDashboardStats(apiUrl)
      .then(result => { if (!cancelled && isUsableStats(result)) setStats(result); })
      .catch(() => { /* legacy request-based numbers stay in use */ });
    return () => { cancelled = true; };
  }, [apiUrl]);

  const data = useMemo(() => {
    const loans30 = dailySeries(requests, 30, now);
    const trusts30 = dailySeries(trusts, 30, now);
    const productKeys = Object.keys(productNames);
    const colorFor = key => (key === 'other' ? OTHER_COLOR : SPECTRUM[PRODUCT_HUES[Math.max(0, productKeys.indexOf(key)) % PRODUCT_HUES.length]]);
    const sLoans = stats?.loans || null;
    const loanSeries = statsSeries(sLoans?.createdPerDay);
    const trustSeries = statsSeries(stats?.trusts?.createdPerDay);
    const resolvedSeries = statsSeries(sLoans?.resolvedPerDay);
    const tail = values => values.slice(-14);
    const mixRows = sLoans ? statsProductMix(sLoans.byProduct, productNames) : productMix(requests, productNames).map(row => ({ key: row.key, label: row.label, value: row.count }));
    return {
      dates: (loanSeries || trustSeries)?.dates || loans30.map(point => point.date),
      loans30: loanSeries ? loanSeries.values : loans30.map(point => point.value),
      trusts30: trustSeries ? trustSeries.values : trusts30.map(point => point.value),
      spark: {
        total: loanSeries ? tail(loanSeries.values) : dailySeries(requests, 14, now).map(point => point.value),
        pending: dailySeries(requests, 14, now, isPending).map(point => point.value),
        resolved: resolvedSeries ? tail(resolvedSeries.values) : dailySeries(requests, 14, now, isResolved).map(point => point.value),
        trusts: trustSeries ? tail(trustSeries.values) : dailySeries(trusts, 14, now).map(point => point.value),
      },
      delta: {
        total: loanSeries ? seriesDelta(loanSeries.values) : weekDelta(requests, now).diff,
        pending: weekDelta(requests, now, isPending).diff,
        resolved: resolvedSeries ? seriesDelta(resolvedSeries.values) : weekDelta(requests, now, isResolved).diff,
        trusts: trustSeries ? seriesDelta(trustSeries.values) : weekDelta(trusts, now).diff,
      },
      mix: mixRows.map(row => ({ ...row, color: colorFor(row.key) })),
      channels: sLoans ? statsChannels(sLoans.byChannel).map(row => ({ ...row, color: CHANNEL_COLORS[row.key] })) : null,
      rate: resolutionRate(requests),
      pendingCount: requests.filter(isPending).length,
      resolvedCount: requests.filter(isResolved).length,
      feed: recentActivity(requests, trusts, 6),
    };
  }, [requests, trusts, productNames, now, stats]);

  const firstName = String(user?.name || '').trim().split(/\s+/).pop() || '';
  const sLoans = stats?.loans || null;
  const sTrusts = stats?.trusts || null;
  const lk = sLoans ? loanKpis(sLoans) : null;
  const statusCounts = sLoans?.byTaskStatus || summary?.counts || null;
  const statusTotal = sLoans ? Number(sLoans.total) || 0 : Number(summary?.total) || 0;
  const pipeline = statusCounts ? TASK_STATUSES.map(code => ({ key: code, label: TASK_STATUS_LABELS[code], value: Number(statusCounts[code]) || 0, color: SPECTRUM[STATUS_HUES[code]] })) : null;
  const resolvedShown = sLoans ? Number(sLoans.byTaskStatus?.resolved) || 0 : data.resolvedCount;
  const pendingShown = sLoans ? Math.max(0, lk.total - resolvedShown - (Number(sLoans.byTaskStatus?.rejected) || 0)) : data.pendingCount;
  const rate = sLoans ? (lk.total ? Math.round((resolvedShown / lk.total) * 100) : 0) : data.rate;
  const loanKpiList = lk
    ? [
      { hue: 'indigo', icon: ClipboardList, label: 'Нийт зээлийн хүсэлт', value: lk.total, diff: data.delta.total, spark: data.spark.total },
      { hue: 'cyan', icon: Inbox, label: 'Шинэ / хуваарилаагүй', value: lk.unassigned, note: 'Хариуцагчгүй, шийдэгдээгүй' },
      { hue: 'gold', icon: Paperclip, label: 'Нэмэлт материал хүлээж буй', value: lk.awaitingDocs, note: 'Өргөдөл гаргагчийн хариу хүлээж буй' },
      { hue: 'green', icon: CheckCircle2, label: 'Шийдсэн (30 хоног)', value: lk.resolved30, diff: data.delta.resolved, spark: data.spark.resolved },
    ]
    : [
      { hue: 'indigo', icon: ClipboardList, label: 'Нийт зээлийн хүсэлт', value: requests.length, diff: data.delta.total, spark: data.spark.total },
      { hue: 'gold', icon: Hourglass, label: 'Хүлээгдэж буй', value: data.pendingCount, diff: data.delta.pending, spark: data.spark.pending },
      { hue: 'green', icon: CheckCircle2, label: 'Шийдвэрлэсэн', value: data.resolvedCount, diff: data.delta.resolved, spark: data.spark.resolved },
    ];
  const kpis = [
    ...loanKpiList,
    sTrusts
      ? { hue: 'violet', icon: Handshake, label: 'Итгэлцлийн хүсэлт (нээлттэй)', value: Number(sTrusts.open) || 0, diff: data.delta.trusts, spark: data.spark.trusts }
      : { hue: 'violet', icon: Handshake, label: 'Итгэлцлийн хүсэлт', value: trusts.length, diff: data.delta.trusts, spark: data.spark.trusts },
    ...(showOnboarding ? [{ hue: 'cyan', icon: UserCheck, label: 'Харилцагч бүртгэл', value: onboardingCount, note: 'Нийт илгээсэн бүртгэл' }] : []),
  ];
  const showSkeleton = loading && !stats && requests.length === 0 && trusts.length === 0;

  return <div className="adm-dash mx-auto max-w-[1440px] space-y-5">
    <header className="adm-rise flex flex-wrap items-end justify-between gap-5 pb-2" style={{ '--d': 0 }}>
      <div className="min-w-0">
        <p className="adm-eyebrow" style={{ color: SPECTRUM.indigo }}>Хянах самбар</p>
        <h1 className="adm-hero-text mt-2 text-[30px] font-bold leading-[1.1] tracking-tight md:text-[40px]">{greeting(now)}{firstName ? `, ${firstName}` : ''}</h1>
        <p className="mt-2 max-w-xl text-sm text-[var(--adm-ink-2)]">Хүсэлтийн урсгал, шийдвэрлэлт ба сүүлийн үйл ажиллагааны тойм.</p>
      </div>
      <button type="button" onClick={() => onNavigate?.('los')} className="adm-btn" style={{ '--hue': SPECTRUM.green }}>
        Зээлийн хүсэлт рүү <ArrowRight size={16} aria-hidden="true" />
      </button>
    </header>

    <section aria-label="Гол үзүүлэлтүүд" className={`grid grid-cols-2 gap-3 sm:gap-4 ${kpis.length > 5 ? 'xl:grid-cols-6' : kpis.length > 4 ? 'xl:grid-cols-5' : 'lg:grid-cols-4'}`}>
      {kpis.map((kpi, index) => showSkeleton
        ? <div key={kpi.label} className="glass h-[214px] p-5"><div className="adm-skeleton h-10 w-10" /><div className="adm-skeleton mt-6 h-3 w-32" /><div className="adm-skeleton mt-3 h-8 w-20" /><div className="adm-skeleton mt-6 h-9 w-full" /></div>
        : <KpiCard key={kpi.label} index={index} total={kpis.length} {...kpi} />)}
    </section>

    {pipeline && <GlassCard hue="cyan" tilt={false} className="adm-rise p-5 md:p-6" style={{ '--d': 5 }}>
      <CardHeader eyebrow="Ажлын урсгал" title="Зээлийн хүсэлтийн шат" action={<span className="adm-tnum text-sm text-[var(--adm-ink-3)]">нийт <b className="text-white">{statusTotal || pipeline.reduce((sum, row) => sum + row.value, 0)}</b></span>} />
      <StackedBar segments={pipeline} />
    </GlassCard>}

    <div className="grid gap-4 lg:grid-cols-3">
      <GlassCard hue="cyan" tilt={false} className="adm-rise p-5 md:p-6 lg:col-span-2" style={{ '--d': 6 }}>
        <CardHeader
          eyebrow="30 хоног"
          title="Хүсэлтийн урсгал"
          action={<div className="flex flex-wrap items-center gap-4 text-[12.5px] text-[var(--adm-ink-2)]">
            <span className="flex items-center gap-2"><span className="h-[3px] w-5 rounded-full" style={{ background: `linear-gradient(90deg, ${SPECTRUM.cyan}, ${SPECTRUM.green})` }} aria-hidden="true" />Зээл</span>
            <span className="flex items-center gap-2"><span className="h-[3px] w-5 rounded-full" style={{ background: `linear-gradient(90deg, ${SPECTRUM.gold}, ${SPECTRUM.amber})` }} aria-hidden="true" />Итгэлцэл</span>
          </div>}
        />
        {showSkeleton ? <div className="adm-skeleton h-[300px] w-full" /> : <AreaChart
          label="Сүүлийн 30 хоногийн хүсэлт"
          height={300}
          dates={data.dates}
          series={[
            { id: 'loans', label: 'Зээл', values: data.loans30, colors: [SPECTRUM.cyan, SPECTRUM.green] },
            { id: 'trusts', label: 'Итгэлцэл', values: data.trusts30, colors: [SPECTRUM.gold, SPECTRUM.amber] },
          ]}
        />}
      </GlassCard>

      <GlassCard hue="violet" tilt={false} className="adm-rise p-5 md:p-6" style={{ '--d': 7 }}>
        <CardHeader eyebrow="Бүтээгдэхүүн" title="Зээлийн бүтэц" />
        <Donut segments={data.mix} centerLabel="хүсэлт" />
      </GlassCard>
    </div>

    {sLoans && data.channels && <div className="grid gap-4 lg:grid-cols-3">
      <GlassCard hue="indigo" tilt={false} className="adm-rise p-5 md:p-6" style={{ '--d': 8 }}>
        <CardHeader eyebrow="Суваг" title="Хүсэлт ирсэн суваг" />
        <StackedBar segments={data.channels} />
      </GlassCard>
      <GlassCard hue="amber" tilt={false} className="adm-rise p-5 md:p-6 lg:col-span-2" style={{ '--d': 9 }}>
        <CardHeader eyebrow="Анхаарах" title="Шуурхай хийх зүйл" action={sLoans.avgFirstResponseHours != null ? <span className="adm-tnum text-sm text-[var(--adm-ink-3)]" title="Хүсэлт ирснээс эхний ажилтны үйлдэл хүртэл">эхний хариу ~ <b className="text-white">{sLoans.avgFirstResponseHours}</b> цаг</span> : null} />
        <ul className="grid gap-3 sm:grid-cols-2">
          {[
            { key: 'overdue', icon: AlertTriangle, hue: SPECTRUM.amber, count: lk.overdue, text: 'Хуваарилсан, 3+ хоног хөдөлгөөнгүй' },
            { key: 'unassigned', icon: UserX, hue: SPECTRUM.cyan, count: lk.unassigned, text: 'Хариуцагч оноогоогүй хүсэлт' },
          ].map(item => {
            const Icon = item.icon;
            return <li key={item.key}>
              <button type="button" onClick={() => onNavigate?.('los')} className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-left transition-colors hover:bg-white/[0.06]">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: `${item.hue}1F`, color: item.hue }}><Icon size={17} aria-hidden="true" /></span>
                <span className="min-w-0 flex-1"><span className="adm-tnum block text-xl font-bold text-white">{item.count}</span><span className="block truncate text-[12.5px] text-[var(--adm-ink-3)]">{item.text}</span></span>
                <ArrowRight size={15} className="shrink-0 text-[var(--adm-ink-3)]" aria-hidden="true" />
              </button>
            </li>;
          })}
        </ul>
        {lk.overdue === 0 && lk.unassigned === 0 && <p className="mt-4 text-[12.5px] text-[var(--adm-ink-3)]">Анхаарах хүсэлт алга.</p>}
      </GlassCard>
    </div>}

    <div className="grid gap-4 lg:grid-cols-3">
      <GlassCard hue="green" tilt={false} className="adm-rise flex flex-col p-5 md:p-6" style={{ '--d': 8 }}>
        <CardHeader eyebrow="Гүйцэтгэл" title="Шийдвэрлэлтийн хувь" />
        <div className="flex flex-1 flex-col justify-center">
          <Gauge value={rate} from={SPECTRUM.cyan} to={SPECTRUM.green} label="шийдсэн" />
          <div className="mt-4 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5"><p className="text-[11.5px] text-[var(--adm-ink-3)]">Шийдсэн</p><p className="adm-tnum text-lg font-bold text-white">{resolvedShown}</p></div>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5"><p className="text-[11.5px] text-[var(--adm-ink-3)]">Хүлээгдэж буй</p><p className="adm-tnum text-lg font-bold text-white">{pendingShown}</p></div>
          </div>
        </div>
      </GlassCard>

      <GlassCard hue="indigo" tilt={false} className="adm-rise p-5 md:p-6 lg:col-span-2" style={{ '--d': 9 }}>
        <CardHeader eyebrow="Сүүлийн үйл ажиллагаа" title="Шинэ хүсэлтүүд" action={<button type="button" onClick={() => onNavigate?.('los')} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold text-[var(--adm-ink-2)] transition-colors hover:bg-white/[0.06] hover:text-white">Бүгдийг харах <ArrowRight size={14} aria-hidden="true" /></button>} />
        {data.feed.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-[var(--adm-ink-3)]">{showSkeleton ? 'Ачаалж байна…' : 'Хүсэлт байхгүй байна.'}</p>}
        <ul className="-mx-2 divide-y divide-white/[0.05]">
          {data.feed.map(({ kind, item }) => {
            const hue = kind === 'loan' ? SPECTRUM.cyan : SPECTRUM.gold;
            const name = kind === 'loan' ? `${item.lastname || ''} ${item.firstname || item.orgName || ''}`.trim() : `${item.lastname || ''} ${item.firstname || ''}`.trim();
            const detail = kind === 'loan' ? (productNames[item.selectedProduct] || 'Зээлийн хүсэлт') : 'Итгэлцэл';
            return <li key={`${kind}-${item._id}`} className="flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-white/[0.03]">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13px] font-bold" style={{ background: `${hue}1A`, color: hue, boxShadow: `inset 0 0 0 1px ${hue}33` }} aria-hidden="true">{(name || '?').charAt(0).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{name || 'Нэргүй'}</p>
                <p className="truncate text-[12.5px] text-[var(--adm-ink-3)]">{detail} · {relativeTime(item.createdAt, now.getTime())}</p>
              </div>
              <StatusPill resolved={item.status === 'resolved'} />
            </li>;
          })}
        </ul>
      </GlassCard>
    </div>
  </div>;
}
