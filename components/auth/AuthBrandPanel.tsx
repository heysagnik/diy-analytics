import Image from 'next/image';

interface AuthBrandPanelProps {
  headline: string;
  subtext: string;
}

const SPARKLINE_CURVE = 'M 0,36 C 10,36 15,33 25,34 C 35,35 40,24 50,25 C 60,26 65,14 75,16 C 85,18 90,6 100,4';
const SPARKLINE_AREA = `${SPARKLINE_CURVE} L 100,40 L 0,40 Z`;

/**
 * Left-hand brand panel for the split auth layout. Deliberately dark
 * (`.dark`-scoped) regardless of the form side, which stays light per
 * product decision — this is a fixed brand moment, not a themeable surface.
 */
export default function AuthBrandPanel({ headline, subtext }: AuthBrandPanelProps) {
  return (
    <div className="dark relative hidden overflow-hidden bg-background text-foreground lg:flex lg:w-[44%] lg:flex-col lg:justify-between lg:p-10 xl:w-2/5 xl:p-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            'radial-gradient(620px 460px at 12% -8%, color-mix(in oklch, var(--primary), transparent 62%), transparent 62%)',
            'radial-gradient(480px 420px at 100% 100%, color-mix(in oklch, var(--primary), transparent 82%), transparent 70%)',
          ].join(', '),
        }}
      />
      {/* Faint technical grid — reinforces the "quietly technical" brand
          register from design.md without introducing a second accent. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative z-10">
        <Image src="/brand/logo-dark.svg" alt="DIY Analytics" width={91} height={12} className="h-5 w-auto" />
      </div>

      <div className="relative z-10 max-w-sm">
        <h2 className="text-balance font-display text-3xl font-semibold leading-[1.15] tracking-tight xl:text-[2.25rem]">
          {headline}
        </h2>
        <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground">{subtext}</p>

        <div
          className="mt-8 rounded-xl border border-border/80 p-4 shadow-[var(--overlay-shadow)]"
          style={{ backgroundColor: 'var(--surface-2)' }}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium tracking-wide text-muted-foreground">Pageviews this week</p>
            <p className="flex items-center gap-1 text-xs font-medium text-emerald-400">
              <span aria-hidden="true" className="text-[10px]">▲</span> 18%
            </p>
          </div>
          <p className="mt-1 font-mono text-2xl font-semibold tracking-tight tabular-nums text-foreground">
            12,406
          </p>
          <div className="relative mt-3 h-10 w-full">
            <svg
              viewBox="0 0 100 40"
              className="h-full w-full"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="auth-sparkline-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={SPARKLINE_AREA} fill="url(#auth-sparkline-fill)" stroke="none" />
              <path
                d={SPARKLINE_CURVE}
                fill="none"
                stroke="var(--chart-1)"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      <p className="relative z-10 text-xs text-muted-foreground">
        No cookies. No tracking scripts. Just the numbers that matter.
      </p>
    </div>
  );
}
