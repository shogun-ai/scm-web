// D23: submission channel badge for staff views. 'web' (the plain form) shows no badge.
const CHANNELS = {
  messenger: { label: 'Messenger', className: 'bg-sky-100 text-sky-800' },
  webchat: { label: 'Вэб чат', className: 'bg-violet-100 text-violet-800' },
};

export default function ChannelBadge({ channel, className = 'ml-2' }) {
  const info = CHANNELS[channel];
  if (!info) return null;
  return <span className={`${className} inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${info.className}`}>{info.label}</span>;
}
