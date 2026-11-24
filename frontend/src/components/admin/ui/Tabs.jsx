import { useRef } from 'react';

// Segmented chip tabs (role="tablist"); arrow keys move between tabs. Scrolls horizontally on mobile.
// items: [{ id, label, count?, dot? }]
export default function Tabs({ items, value, onChange, label, panelId }) {
  const refs = useRef([]);
  const onKey = (event, index) => {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (index + delta + items.length) % items.length;
    refs.current[next]?.focus();
    onChange(items[next].id);
  };
  return <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0" role="tablist" aria-label={label}>
    {items.map((item, index) => {
      const selected = item.id === value;
      return <button key={item.id} ref={el => { refs.current[index] = el; }} type="button" role="tab" aria-selected={selected} aria-pressed={selected} aria-controls={panelId} tabIndex={selected ? 0 : -1} onClick={() => onChange(item.id)} onKeyDown={event => onKey(event, index)} className="adm-chip-btn">
        {item.dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: item.dot }} aria-hidden="true" />}
        {item.label}{item.count != null && <span className="adm-chip-btn__count adm-tnum">{item.count}</span>}
      </button>;
    })}
  </div>;
}
