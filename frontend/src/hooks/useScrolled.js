import { useState, useEffect } from 'react';

/**
 * Scroll position threshold-ыг хянадаг hook.
 * @param {number} threshold — хэдэн px-ийн дараа scrolled=true болох (default: 50)
 * @returns {boolean} scrolled
 */
export function useScrolled(threshold = 50) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > threshold);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return scrolled;
}
