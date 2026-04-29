/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  safelist: [
    // inp constant classes
    'w-full',
    'p-2.5',
    'border',
    'rounded-lg',
    'text-sm',
    'bg-white',
    'focus:outline-none',
    'focus:border-[#003B5C]',
    // label constant classes
    'text-[11px]',
    'font-bold',
    'uppercase',
    'text-slate-500',
    // sectionHdr constant classes
    'text-[#003B5C]',
    'flex',
    'items-center',
    'gap-2',
    // disabled states
    'disabled:opacity-50',
    'bg-slate-50',
    'text-slate-500',
    'cursor-not-allowed',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
