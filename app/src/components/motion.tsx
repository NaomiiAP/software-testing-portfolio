/**
 * Motion helpers. Everything respects `prefers-reduced-motion`: with reduced
 * motion the final state is rendered immediately (no opacity/transform tweens).
 * The Selenium suite runs Chrome with --force-prefers-reduced-motion, so tests
 * never read half-faded text.
 */
import { animate, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';

// eslint-disable-next-line react-refresh/only-export-components
export function useMotionOK(): boolean {
  return !useReducedMotion();
}

export function Reveal({
  children,
  delay = 0,
  y = 16,
  className,
  inView = false,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  /** animate when scrolled into view instead of on mount */
  inView?: boolean;
}) {
  const ok = useMotionOK();
  if (!ok) return <div className={className}>{children}</div>;
  const target = { opacity: 1, y: 0 };
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      {...(inView ? { whileInView: target, viewport: { once: true, margin: '-60px' } } : { animate: target })}
      transition={{ duration: 0.55, delay, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Animates a number from its previous value to the new one (fare totals, stats). */
export function CountUp({ value, format = (n) => String(n) }: { value: number; format?: (n: number) => string }) {
  const ok = useMotionOK();
  const [shown, setShown] = useState(value);
  const previous = useRef(value);

  useEffect(() => {
    if (!ok || previous.current === value) {
      previous.current = value;
      setShown(value);
      return;
    }
    const controls = animate(previous.current, value, {
      duration: 0.6,
      ease: 'easeOut',
      onUpdate: (v) => setShown(Math.round(v)),
    });
    previous.current = value;
    return () => controls.stop();
  }, [value, ok]);

  return <>{format(shown)}</>;
}
