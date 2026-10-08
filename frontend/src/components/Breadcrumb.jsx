import React from 'react';

/**
 * Breadcrumb
 * items: Array<{ label: string, onClick?: () => void }>
 * Сүүлийн item нь aria-current="page" авна, onClick байхгүй байна.
 */
export default function Breadcrumb({ items = [] }) {
  if (!items.length) return null;

  return (
    <nav aria-label="Navigational breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1 text-sm font-sans">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={idx} className="flex items-center gap-1">
              {isLast ? (
                <span
                  aria-current="page"
                  className="text-[#D4AF37] font-bold truncate max-w-[200px]"
                >
                  {item.label}
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={item.onClick}
                    className="text-white/70 hover:text-[#D4AF37] transition-colors duration-200 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] rounded"
                  >
                    {item.label}
                  </button>
                  {/* Gold separator */}
                  <span aria-hidden="true" className="text-[#D4AF37]/50 select-none font-bold">
                    /
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
