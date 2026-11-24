import { hueColor } from '../theme/spectrum';

// Module page header on the dark sky: hue eyebrow, gradient-free white title, count line, right-aligned actions.
export default function PageHeader({ hue = 'indigo', icon: Icon, eyebrow, title, count, countLabel = 'бичлэг', description, actions }) {
  const color = hueColor(hue);
  return <div className="flex flex-wrap items-end justify-between gap-3">
    <div className="min-w-0">
      {eyebrow && <p className="adm-eyebrow flex items-center gap-2" style={{ color: `color-mix(in srgb, ${color} 62%, white)` }}>{Icon && <Icon size={14} aria-hidden="true" />}{eyebrow}</p>}
      <h2 className="mt-1.5 text-[26px] font-bold leading-tight tracking-tight text-white md:text-[30px]">{title}</h2>
      {(count != null || description) && <p className="mt-1 text-sm text-[var(--adm-ink-2)]">
        {count != null && <><span className="adm-tnum font-semibold text-white">{count}</span> {countLabel}</>}
        {count != null && description ? ' · ' : ''}{description}
      </p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>;
}
