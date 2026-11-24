// Солонго Капитал — admin spectrum tokens.
// White light refracted through a prism: seven hues, each one a module's accent.
// Values are tuned for a near-black twilight canvas (used as accents/strokes, not as body text).

export const SPECTRUM = {
  rose: '#FF6B86',
  amber: '#FFA25C',
  gold: '#F3CB55',
  green: '#34D399',
  cyan: '#4CC6FF',
  indigo: '#7C8CFF',
  violet: '#B794FF',
};

// Order in which the spectrum is read (prism exit order).
export const SPECTRUM_ORDER = ['rose', 'amber', 'gold', 'green', 'cyan', 'indigo', 'violet'];

export const hueColor = hue => SPECTRUM[hue] || hue || SPECTRUM.indigo;

// Module → hue. One hue per module, used for icon tint, active rail indicator and card edge light.
export const MODULE_HUES = {
  dashboard: 'indigo',
  los: 'green',
  trusts: 'gold',
  documentAnalysis: 'violet',
  onboarding: 'cyan',
  loanTaskConfig: 'cyan',
  finance: 'amber',
  cms: 'amber',
  chatbot: 'cyan',
  botContent: 'cyan',
  users: 'cyan',
  permissions: 'indigo',
  logs: 'green',
  deleteSettings: 'rose',
  facebook: 'indigo',
  profile: 'violet',
};
