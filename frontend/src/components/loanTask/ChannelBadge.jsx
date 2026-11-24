// D23: submission channel badge for staff views. 'web' (the plain form) shows no badge.
const CHANNELS = {
  messenger: { label: 'Messenger', light: 'bg-sky-100 text-sky-800', dark: 'bg-[#4CC6FF]/[0.12] text-[#A6E6FF] ring-1 ring-inset ring-[#4CC6FF]/25' },
  webchat: { label: 'Вэб чат', light: 'bg-violet-100 text-violet-800', dark: 'bg-[#B794FF]/[0.12] text-[#DCC9FF] ring-1 ring-inset ring-[#B794FF]/25' },
};

export default function ChannelBadge({ channel, tone = 'light', className = 'ml-2' }) {
  const info = CHANNELS[channel];
  if (!info) return null;
  return <span className={`${className} inline-flex items-center rounded-full px-2 py-0.5 font-sans text-[10px] font-semibold ${tone === 'dark' ? info.dark : info.light}`}>{info.label}</span>;
}
