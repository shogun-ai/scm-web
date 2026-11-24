import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

const canMatch = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function';

export function useMediaQuery(query) {
  return useSyncExternalStore(
    onChange => {
      if (!canMatch()) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => (canMatch() ? window.matchMedia(query).matches : false),
    () => false,
  );
}

export const useReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');
// Hover-capable fine pointer (mouse/trackpad). Tilt/spotlight are skipped on touch.
export const useFinePointer = () => useMediaQuery('(hover: hover) and (pointer: fine)');

export function useDocumentVisible() {
  return useSyncExternalStore(
    onChange => {
      document.addEventListener('visibilitychange', onChange);
      return () => document.removeEventListener('visibilitychange', onChange);
    },
    () => document.visibilityState !== 'hidden',
    () => true,
  );
}

// Writes the pointer position into --mx / --my on the element (no React re-render).
export function useSpotlight(ref, { enabled = true } = {}) {
  const fine = useFinePointer();
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled || !fine) return undefined;
    let frame = 0;
    let x = 0;
    let y = 0;
    const apply = () => { frame = 0; el.style.setProperty('--mx', `${x}px`); el.style.setProperty('--my', `${y}px`); };
    const onMove = event => {
      const rect = el.getBoundingClientRect();
      x = event.clientX - rect.left;
      y = event.clientY - rect.top;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    el.addEventListener('pointermove', onMove, { passive: true });
    return () => { el.removeEventListener('pointermove', onMove); if (frame) cancelAnimationFrame(frame); };
  }, [ref, enabled, fine]);
}

// Tilts the element a few degrees toward the pointer via --rx / --ry / --lift.
export function usePointerTilt(ref, { max = 4, lift = 3, enabled = true } = {}) {
  const fine = useFinePointer();
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled || !fine || reduced) return undefined;
    let frame = 0;
    let nx = 0;
    let ny = 0;
    const apply = () => {
      frame = 0;
      el.style.setProperty('--rx', `${(-ny * max).toFixed(2)}deg`);
      el.style.setProperty('--ry', `${(nx * max).toFixed(2)}deg`);
      el.style.setProperty('--lift', `${-lift}px`);
    };
    const onMove = event => {
      const rect = el.getBoundingClientRect();
      nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      if (frame) { cancelAnimationFrame(frame); frame = 0; }
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
      el.style.setProperty('--lift', '0px');
    };
    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerleave', onLeave);
    return () => { el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerleave', onLeave); onLeave(); };
  }, [ref, max, lift, enabled, fine, reduced]);
}

// Eased count-up from the previous value to `target`. Returns the target immediately under reduced motion.
export function useCountUp(target, { duration = 900 } = {}) {
  const reduced = useReducedMotion();
  const safeTarget = Number.isFinite(Number(target)) ? Number(target) : 0;
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    if (reduced) return undefined;
    let frame = 0;
    const from = fromRef.current;
    const start = performance.now();
    const tick = now => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      const value = from + (safeTarget - from) * eased;
      fromRef.current = value;
      setDisplay(value);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [safeTarget, duration, reduced]);
  return reduced ? safeTarget : Math.round(display);
}
