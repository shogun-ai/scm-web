export const DEFAULT_HERO_SLIDER_INTERVAL = 15;
export const MIN_HERO_SLIDER_INTERVAL = 3;
export const MAX_HERO_SLIDER_INTERVAL = 120;

export function isValidHeroSliderInterval(value) {
  return typeof value === 'number' && Number.isInteger(value)
    && (value === 0 || (value >= MIN_HERO_SLIDER_INTERVAL && value <= MAX_HERO_SLIDER_INTERVAL));
}

// Stored values may predate numeric validation. Never treat an empty value as off.
export function normalizeHeroSliderInterval(value) {
  const interval = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return isValidHeroSliderInterval(interval) ? interval : DEFAULT_HERO_SLIDER_INTERVAL;
}
