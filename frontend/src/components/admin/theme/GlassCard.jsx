import { useRef } from 'react';
import { hueColor } from './spectrum';
import { usePointerTilt, useSpotlight } from './hooks';

// Liquid-glass card: translucent layered surface, specular rim, cursor spotlight and gentle tilt.
export default function GlassCard({ as = 'div', hue = 'indigo', interactive = true, tilt = true, glint = false, className = '', style, children, ...rest }) {
  const Tag = as;
  const ref = useRef(null);
  useSpotlight(ref, { enabled: interactive });
  usePointerTilt(ref, { enabled: interactive && tilt, max: 3.5, lift: 3 });
  return <Tag ref={ref} className={`glass adm-card ${className}`} style={{ '--hue': hueColor(hue), ...style }} {...rest}>
    <span className="adm-card__rim" aria-hidden="true" />
    {interactive && <span className="adm-card__spot" aria-hidden="true" />}
    {interactive && <span className="adm-card__edge" aria-hidden="true" />}
    {glint && <span className="adm-card__glint" aria-hidden="true" />}
    <div className="adm-card__body h-full">{children}</div>
  </Tag>;
}
