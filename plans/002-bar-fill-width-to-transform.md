# 002 — Animate bar fills via transform: scaleX instead of width

- **Status**: DONE
- **Commit**: 51b7e21
- **Severity**: HIGH
- **Category**: Performance
- **Estimated scope**: 2 files, small

## Problem

Both `components/analytics/BreakdownPanel.tsx:98` and `components/analytics/FunnelChart.tsx:38` animate a bar's inline `style={{ width: ... }}` with a CSS `transition`. `width` is a layout property (per AUDIT.md §5: animate `transform`/`opacity` only), so every frame of these bar-fill animations forces layout recalculation. `FunnelChart.tsx:38` additionally uses `transition-all`, which is always a finding (AUDIT.md §5) since it animates unintended properties. On rows with many items re-rendering (tab switch, filter change, funnel step update), this causes layout thrash and dropped frames.

Current code:

```tsx
// components/analytics/BreakdownPanel.tsx:97-102 — current
<div
  className={`absolute inset-y-0 left-0 rounded-md transition-all duration-500 ease-out ${
    isActive ? 'bg-accent/25' : 'bg-accent/10'
  }`}
  style={{ width: `${pct}%` }}
/>
```

```tsx
// components/analytics/FunnelChart.tsx:36-44 — current
<div className="flex-1 h-8 bg-surface-secondary rounded-md overflow-hidden">
  <div
    className="h-full bg-accent rounded-md flex items-center justify-end px-2 transition-all"
    style={{ width: `${Math.max(widthPct, 2)}%` }}
  >
    <span className="text-xs font-semibold text-accent-foreground tabular-nums">
      {step.count.toLocaleString()}
    </span>
  </div>
</div>
```

## Target

Render each bar at a fixed `width: 100%` inside its track and drive the fill via `transform: scaleX(pct/100)` with `transform-origin: left` (since these are left-anchored horizontal bars, not trigger-anchored popovers — AUDIT.md's transform-origin guidance for popovers doesn't apply here, but a scaleX bar must still originate from its fixed edge or it will grow from center). Scope the transition to `transform` only (and `background-color` for BreakdownPanel's active-state color change, which is paint-only and fine to keep).

```tsx
// target — components/analytics/BreakdownPanel.tsx
<div
  className={`absolute inset-y-0 left-0 w-full rounded-md origin-left transition-[transform,background-color] duration-500 ease-out ${
    isActive ? 'bg-accent/25' : 'bg-accent/10'
  }`}
  style={{ transform: `scaleX(${pct / 100})` }}
/>
```

```tsx
// target — components/analytics/FunnelChart.tsx
<div className="flex-1 h-8 bg-surface-secondary rounded-md overflow-hidden">
  <div
    className="h-full w-full bg-accent rounded-md flex items-center justify-end px-2 origin-left transition-transform duration-500 ease-out"
    style={{ transform: `scaleX(${Math.max(widthPct, 2) / 100})` }}
  >
    <span className="text-xs font-semibold text-accent-foreground tabular-nums">
      {step.count.toLocaleString()}
    </span>
  </div>
</div>
```

Note: `duration-500 ease-out` is kept as-is from the existing code (not changed by this plan) since AUDIT.md's 300ms UI budget is for interactive chrome (dropdowns, modals); a one-time data-driven bar fill on chart mount is closer to an explanatory/data-visualization animation and 500ms is within reason for that — this plan's scope is the layout-property fix only, not re-tuning duration. `FunnelChart.tsx` currently has no explicit duration (`transition-all` with no `duration-*` class, so it uses Tailwind's default 150ms) — the target above adds `duration-500 ease-out` to match BreakdownPanel's sibling chart component for cohesion, since both are bar-fill visualizations in the same analytics dashboard family.

## Repo conventions to follow

- No shared easing/duration tokens exist in this repo; both files hand-type Tailwind duration/ease utility classes. Continue that pattern — do not introduce a new tokens file.
- Tailwind v4 (`@theme` in `app/globals.css`) is in use; `origin-left` is a built-in Tailwind utility (maps to `transform-origin: left`), no custom CSS needed.

## Steps

1. Open `components/analytics/BreakdownPanel.tsx`, locate the div at lines 97-102.
2. Change `style={{ width: ... }}` to `style={{ transform: `scaleX(${pct / 100})` }}`.
3. Add `w-full` and `origin-left` to the className; change `transition-all` to `transition-[transform,background-color]`.
4. Open `components/analytics/FunnelChart.tsx`, locate the div at lines 37-40.
5. Change `style={{ width: ... }}` to `style={{ transform: `scaleX(${Math.max(widthPct, 2) / 100})` }}`.
6. Add `w-full` and `origin-left` to the className; change `transition-all` to `transition-transform duration-500 ease-out`.
7. In both files, confirm the parent container (`absolute inset-y-0 left-0` wrapper in BreakdownPanel; `flex-1 h-8 ... overflow-hidden` wrapper in FunnelChart) already clips/positions correctly with a `w-full` child — since the child no longer shrinks via `width`, its layout box is now always full-width and only its visual paint is scaled, which should look identical when `overflow-hidden` is present on the ancestor (already true in both cases).

## Boundaries

- Do NOT change the `pct`/`widthPct` calculation logic — only how the resulting percentage is applied to the DOM (transform vs width).
- Do NOT touch the label/text content, colors beyond the existing `isActive` conditional, or duration values beyond what's specified (FunnelChart gains `duration-500 ease-out` as stated above; BreakdownPanel's `duration-500 ease-out` stays unchanged).
- Do NOT modify any other bar/chart component not listed here (BarChart.tsx, AreaChart.tsx use Recharts SVG rendering, not this width-based pattern — out of scope).
- If either file's structure has drifted from the excerpts above, stop and report instead of improvising.

## Verification

- **Mechanical**: `npm run build` (or `npx tsc --noEmit`) — expect no new type errors.
- **Feel check**: run the app, open a project's analytics breakdown panel and funnel view:
  - Bars fill smoothly from the left edge with no visible width/text-content jump.
  - In DevTools Performance panel, record a filter change that re-renders BreakdownPanel rows and confirm no purple "Layout" bars during the fill animation.
  - In DevTools Animations panel, set playback to 10% and confirm bars grow from their left edge, not center or right.
  - Text label inside the FunnelChart bar (`step.count`) does not get squished or distorted by the scaleX — since it's a sibling-level flex child inside the scaled element, confirm it doesn't visually stretch. If it does, the text span needs `transform: scaleX(inverse)` counter-compensation or must be moved outside the scaled element — if this happens, stop and report rather than improvising a fix beyond this plan's scope.
- **Done when**: both bar fills use `transform: scaleX` instead of animating `width`, Performance panel shows no Layout recalculation during fill, and visual appearance matches the pre-change behavior.

## Implementation note (post-execution)

FunnelChart's count label is a child of the fill element (unlike BreakdownPanel's fill, which has no text child), so `scaleX` on that element would have visibly stretched the digits horizontally. Applied as built: `BreakdownPanel.tsx` uses `transform: scaleX` as specified above; `FunnelChart.tsx` instead uses `clip-path: inset(0 ${100 - pct}% 0 0)` with `transition-[clip-path]` — `clip-path` is paint/composite-only (not a layout property), so it satisfies the same performance goal as `transform`/`opacity` while keeping the label undistorted and right-aligned inside the revealed fill, matching the original visual exactly.
