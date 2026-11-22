/* SVG artwork and animated illustrations. All motion is skipped under prefers-reduced-motion. */
import { motion } from 'framer-motion';
import QRCode from 'qrcode';
import { useEffect, useMemo, useState } from 'react';
import { useMotionOK } from './motion';

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF9B4D" />
          <stop offset="1" stopColor="#EA5A0C" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#logo-g)" />
      <rect x="11" y="8" width="18" height="19" rx="5" fill="#fff" />
      <rect x="14" y="12" width="5" height="5" rx="1.2" fill="#0A1633" />
      <rect x="21" y="12" width="5" height="5" rx="1.2" fill="#0A1633" />
      <circle cx="15.5" cy="22.5" r="1.6" fill="#0A1633" />
      <circle cx="24.5" cy="22.5" r="1.6" fill="#0A1633" />
      <path d="M14 30l-3 4M26 30l3 4M12 32h16" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

// ------------------------------------------------------------------ hero network
const NODES: { code: string; x: number; y: number; hub?: boolean }[] = [
  { code: 'NDLS', x: 300, y: 70, hub: true },
  { code: 'JP', x: 180, y: 120 },
  { code: 'LKO', x: 420, y: 110 },
  { code: 'HWH', x: 500, y: 230, hub: true },
  { code: 'ADI', x: 90, y: 210 },
  { code: 'BPL', x: 290, y: 210 },
  { code: 'NGP', x: 330, y: 280 },
  { code: 'MMCT', x: 120, y: 300, hub: true },
  { code: 'PUNE', x: 170, y: 360 },
  { code: 'SC', x: 320, y: 350 },
  { code: 'SBC', x: 250, y: 410, hub: true },
  { code: 'MAS', x: 400, y: 400, hub: true },
];

const ROUTES = [
  { id: 'r1', d: 'M120 300 Q210 240 290 210 Q300 140 300 70', color: '#FF9B4D', dur: 7, reverse: false },
  { id: 'r2', d: 'M500 230 Q470 160 420 110 Q360 80 300 70', color: '#7DD3FC', dur: 9, reverse: false },
  { id: 'r3', d: 'M400 400 Q360 330 330 280 Q300 250 290 210 Q296 140 300 70', color: '#FF9B4D', dur: 11, reverse: true },
  { id: 'r4', d: 'M250 410 Q290 380 320 350 Q330 310 330 280', color: '#A7F3D0', dur: 6, reverse: false },
  { id: 'r5', d: 'M120 300 Q140 340 170 360 Q250 370 320 350 Q370 370 400 400', color: '#7DD3FC', dur: 10, reverse: true },
  { id: 'r6', d: 'M90 210 Q120 150 180 120 Q240 85 300 70', color: '#FFFFFF', dur: 8, reverse: false },
  { id: 'r7', d: 'M500 230 Q470 330 400 400', color: '#FF9B4D', dur: 8, reverse: false },
  { id: 'r8', d: 'M120 300 Q95 255 90 210', color: '#A7F3D0', dur: 5, reverse: true },
];

const STARS = Array.from({ length: 26 }, (_, i) => ({
  x: (i * 137) % 560,
  y: (i * 89) % 440,
  r: i % 3 === 0 ? 1.4 : 0.9,
  delay: (i % 7) * 0.45,
}));

/** Illustrative network of the sample routes with trains running along them. */
export function RouteNetwork({ className = '' }: { className?: string }) {
  const ok = useMotionOK();
  return (
    <svg viewBox="0 0 560 440" className={className} role="img" aria-label="Illustrative map of RailReserve routes">
      <defs>
        <radialGradient id="train-glow">
          <stop offset="0" stopColor="#fff" stopOpacity=".9" />
          <stop offset=".4" stopColor="#FF9B4D" stopOpacity=".55" />
          <stop offset="1" stopColor="#FF9B4D" stopOpacity="0" />
        </radialGradient>
      </defs>
      {STARS.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" className="motion-safe:animate-twinkle" style={{ animationDelay: `${s.delay}s`, opacity: 0.35 }} />
      ))}
      {ROUTES.map((r) => (
        <g key={r.id}>
          <path id={r.id} d={r.d} fill="none" stroke="rgba(255,255,255,.13)" strokeWidth="2.2" strokeLinecap="round" />
          <path d={r.d} fill="none" stroke={r.color} strokeOpacity=".55" strokeWidth="1.6" strokeDasharray="2 12" strokeLinecap="round" className="motion-safe:animate-[flow_3s_linear_infinite]" />
        </g>
      ))}
      {ok &&
        ROUTES.map((r) => (
          <g key={`t-${r.id}`}>
            <circle r="13" fill="url(#train-glow)">
              <animateMotion dur={`${r.dur}s`} repeatCount="indefinite" keyPoints={r.reverse ? '1;0' : '0;1'} keyTimes="0;1" calcMode="linear">
                <mpath href={`#${r.id}`} />
              </animateMotion>
            </circle>
            <circle r="3.6" fill={r.color}>
              <animateMotion dur={`${r.dur}s`} repeatCount="indefinite" keyPoints={r.reverse ? '1;0' : '0;1'} keyTimes="0;1" calcMode="linear">
                <mpath href={`#${r.id}`} />
              </animateMotion>
            </circle>
          </g>
        ))}
      {NODES.map((n) => (
        <g key={n.code}>
          {n.hub && (
            <circle cx={n.x} cy={n.y} r="7" fill="none" stroke="#FF9B4D" strokeOpacity=".7" className="motion-safe:animate-pulse-ring" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
          )}
          <circle cx={n.x} cy={n.y} r={n.hub ? 6 : 4.5} fill="#0A1633" stroke={n.hub ? '#FFB577' : 'rgba(255,255,255,.75)'} strokeWidth="2" />
          <text x={n.x + 10} y={n.y + 4} fill="rgba(255,255,255,.72)" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="500">
            {n.code}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ------------------------------------------------------------------ trains
/** Side view of a locomotive and two coaches. */
export function TrainArt({ className = '' }: { className?: string }) {
  const coach = (x: number) => (
    <g key={x}>
      <rect x={x} y="10" width="118" height="40" rx="7" fill="#13307A" />
      <rect x={x} y="36" width="118" height="5" fill="#FF7A1A" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={x + 10 + i * 21} y="17" width="14" height="11" rx="2.5" fill="#C7D3F5" />
      ))}
      <circle cx={x + 22} cy="54" r="5.5" fill="#0A1633" />
      <circle cx={x + 96} cy="54" r="5.5" fill="#0A1633" />
    </g>
  );
  return (
    <svg viewBox="0 0 420 62" className={className} aria-hidden="true">
      {coach(0)}
      {coach(124)}
      <path d="M250 10h118c22 0 40 18 46 40H250z" fill="#0E2150" />
      <rect x="250" y="36" width="160" height="5" fill="#FF7A1A" />
      <path d="M372 16h10c10 2 18 10 22 20h-32z" fill="#97AEEB" />
      <rect x="262" y="17" width="16" height="11" rx="2.5" fill="#C7D3F5" />
      <rect x="286" y="17" width="16" height="11" rx="2.5" fill="#C7D3F5" />
      <circle cx="404" cy="44" r="2.5" fill="#FFD0A8" />
      <circle cx="275" cy="54" r="5.5" fill="#0A1633" />
      <circle cx="345" cy="54" r="5.5" fill="#0A1633" />
    </svg>
  );
}

/** A train crossing a track (footer decoration). */
export function RunningTrain() {
  return (
    <div className="relative h-16 overflow-hidden" aria-hidden="true">
      <div className="absolute bottom-3 inset-x-0 h-[3px] bg-white/15" />
      <div className="absolute bottom-0 inset-x-0 h-3 [background:repeating-linear-gradient(90deg,rgba(255,255,255,.12)_0_3px,transparent_3px_22px)]" />
      <TrainArt className="absolute bottom-[14px] left-6 w-[260px] motion-safe:animate-roll-by" />
    </div>
  );
}

/** Payment "processing" loader: train running over moving sleepers. */
export function TrainLoader() {
  return (
    <div className="relative mx-auto h-24 w-72 overflow-hidden" aria-hidden="true">
      <div className="absolute bottom-6 inset-x-0 flex justify-center">
        <TrainArt className="w-56 motion-safe:animate-float" />
      </div>
      <div className="absolute bottom-4 inset-x-0 h-[3px] bg-navy-200" />
      <div className="absolute bottom-0 inset-x-0 h-3 [background:repeating-linear-gradient(90deg,#C7D3F5_0_4px,transparent_4px_20px)] motion-safe:animate-[sleepers_.6s_linear_infinite]" />
    </div>
  );
}

export function SuccessCheck({ size = 72, tone = '#00A88F' }: { size?: number; tone?: string }) {
  const ok = useMotionOK();
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" aria-hidden="true">
      <motion.circle
        cx="36" cy="36" r="32" fill="none" stroke={tone} strokeWidth="5" strokeLinecap="round"
        initial={ok ? { pathLength: 0 } : false} animate={{ pathLength: 1 }} transition={{ duration: 0.6, ease: 'easeOut' }}
      />
      <motion.path
        d="M22 37l10 10 19-21" fill="none" stroke={tone} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"
        initial={ok ? { pathLength: 0 } : false} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 0.5, ease: 'easeOut' }}
      />
    </svg>
  );
}

const CONFETTI_COLORS = ['#FF7A1A', '#00A88F', '#2F5BE0', '#F5A524', '#E5484D', '#97AEEB'];

/** One-shot confetti burst (booking confirmed). */
export function Confetti({ pieces = 42 }: { pieces?: number }) {
  const ok = useMotionOK();
  const bits = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => {
        const angle = (i / pieces) * Math.PI * 2;
        const dist = 140 + ((i * 53) % 160);
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist * 0.6 + 160,
          rotate: (i * 47) % 360,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          w: i % 3 === 0 ? 6 : 9,
          delay: (i % 6) * 0.03,
        };
      }),
    [pieces],
  );
  if (!ok) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-6 flex justify-center" aria-hidden="true">
      {bits.map((b, i) => (
        <motion.span
          key={i}
          className="absolute rounded-[2px]"
          style={{ width: b.w, height: 5, background: b.color }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: b.x, y: b.y, opacity: 0, rotate: b.rotate + 360 }}
          transition={{ duration: 1.6, delay: b.delay, ease: [0.15, 0.7, 0.3, 1] }}
        />
      ))}
    </div>
  );
}

/** QR code rendered as inline SVG (encodes the ticket's key data). */
export function QrCode({ text, size = 116, className = '' }: { text: string; size?: number; className?: string }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    let live = true;
    QRCode.toString(text, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#0A1633', light: '#00000000' } })
      .then((s) => live && setSvg(s))
      .catch(() => live && setSvg(''));
    return () => {
      live = false;
    };
  }, [text]);
  return (
    <div
      className={className}
      style={{ width: size, height: size }}
      role="img"
      aria-label="Ticket QR code"
      data-testid="ticket-qr"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
