import { hueColor } from './spectrum';

// Light "pearl" glass sheet. Existing light-UI tabs render inside it unchanged.
// The backdrop blur lives on a sibling layer, so fixed-position dialogs inside the
// content are NOT re-parented (backdrop-filter on an ancestor would trap them).
export default function GlassSheet({ hue = 'indigo', className = '', children }) {
  return <section className={`adm-sheet adm-sheet-in ${className}`} style={{ '--hue': hueColor(hue) }}>
    <div className="adm-sheet__bg" aria-hidden="true" />
    <div className="adm-sheet__body">{children}</div>
  </section>;
}
