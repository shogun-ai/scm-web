// Dark-glass data table: sticky header inside its own scroll area, row hover light in the module hue,
// and a card list below 768px. Columns: [{ key, header, render(row), align: 'left'|'right', className, hideOnCard, cardLabel }]
// `cardTitle(row)` / `cardAside(row)` / `cardFooter(row)` customise the mobile card; other columns render as label/value pairs.
export default function DataTable({ columns, rows, rowKey = row => row._id, caption, cardTitle, cardAside, cardFooter, selected }) {
  const isSelected = row => (selected ? selected(row) : false);
  return <>
    <div className="glass relative hidden md:block">
      <span className="adm-card__rim" aria-hidden="true" />
      <div className="adm-table-wrap">
        <table className="adm-table w-full text-left text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead><tr>{columns.map(column => <th key={column.key} scope="col" className={column.align === 'right' ? 'text-right' : ''}>{column.header || <span className="sr-only">{column.srHeader || 'Үйлдэл'}</span>}</th>)}</tr></thead>
          <tbody>{rows.map(row => <tr key={rowKey(row)} className="adm-row" data-selected={isSelected(row) ? 'true' : undefined}>
            {columns.map(column => <td key={column.key} className={`${column.align === 'right' ? 'text-right' : ''} ${column.className || ''}`}>{column.render(row)}</td>)}
          </tr>)}</tbody>
        </table>
      </div>
    </div>
    <ul className="space-y-3 md:hidden" aria-label={caption}>{rows.map(row => <li key={rowKey(row)} className="glass relative p-4" data-selected={isSelected(row) ? 'true' : undefined}>
      <span className="adm-card__rim" aria-hidden="true" />
      {(cardTitle || cardAside) && <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">{cardTitle?.(row)}</div>
        {cardAside && <div className="shrink-0">{cardAside(row)}</div>}
      </div>}
      <dl className="relative mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {columns.filter(column => !column.hideOnCard).map(column => <div key={column.key} className={column.cardWide ? 'col-span-2' : ''}>
          <dt className="adm-label">{column.cardLabel || column.header}</dt>
          <dd className="mt-0.5 text-[var(--adm-ink-2)]">{column.render(row)}</dd>
        </div>)}
      </dl>
      {cardFooter && <div className="relative mt-4 flex gap-2">{cardFooter(row)}</div>}
    </li>)}</ul>
  </>;
}
