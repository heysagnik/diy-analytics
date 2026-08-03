# 004 — Crossfade the LiveVisitors count on each poll update

- **Status**: DONE
- **Commit**: 51b7e21
- **Severity**: LOW (missed opportunity)
- **Category**: Missed opportunities
- **Estimated scope**: 1 file, small

## Problem

`components/analytics/LiveVisitors.tsx` polls `/api/analytics/realtime` every 10 seconds and calls `setCount` directly (line 26), which swaps the displayed number instantly on every render. A periodically-updating "live" value that teleports to its new value with no transition reads as a glitch or flicker rather than a deliberate live update — this is exactly the "state changes that teleport" case AUDIT.md §8 calls out.

Current code:

```tsx
// components/analytics/LiveVisitors.tsx:14-51 — current
export const LiveVisitors: React.FC<LiveVisitorsProps> = ({ projectId }) => {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/analytics/realtime?projectId=${projectId}`, { cache: 'no-store' });
        if (!res.ok) return;
        const { data } = await res.json();
        if (!cancelled) setCount(data.count ?? 0);
      } catch {
        // Silently ignore — the badge just stays at its last known value.
      }
    };

    poll();
    const timer = setInterval(poll, 10_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [projectId]);

  if (!count) return null;

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface text-xs font-medium text-foreground">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
      </span>
      {count} {count === 1 ? 'visitor' : 'visitors'} now
    </div>
  );
};
```

## Target

Wrap the count number in its own element keyed by the count value, using a CSS-only crossfade (matching the existing `animate-fade-in` keyframe convention already used elsewhere in this repo, e.g. `components/project/ProjectSelector.tsx:127`) so each new value fades in rather than popping. Since this is a small numeric change (not an enter/exit of a whole element), use a lighter, faster variant than the 300ms popover fade — AUDIT.md's duration budget for this kind of micro-feedback is closest to "button press feedback" (100-160ms) or "hover/color change" territory, so target 150ms.

Add a new keyframe to `app/globals.css` alongside the existing `fadeIn`:

```css
/* target — app/globals.css, add after the existing fadeIn block (after line 237) */
@keyframes countUpdate {
  from {
    opacity: 0;
    transform: translateY(-2px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-count-update {
  animation: countUpdate 150ms ease-out both;
}
```

Add `.animate-count-update` to the existing reduced-motion block (same media query as `.animate-fade-in`, per plan 003 if applied, or the original block if not):

```css
@media (prefers-reduced-motion: reduce) {
  .animate-fade-in,
  .animate-count-update {
    animation: none !important;
  }
}
```

Component change — key the number span by `count` so React remounts it (and thus replays the CSS animation) on every value change:

```tsx
// target — components/analytics/LiveVisitors.tsx, replace the return block
return (
  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface text-xs font-medium text-foreground">
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
    </span>
    <span key={count} className="animate-count-update inline-flex gap-1">
      {count} {count === 1 ? 'visitor' : 'visitors'} now
    </span>
  </div>
);
```

## Repo conventions to follow

- Custom keyframes live inline in `app/globals.css` as `@keyframes name { ... } .animate-name { animation: ... }` pairs — follow the exact `fadeIn`/`.animate-fade-in` pattern at lines 225-237 for the new `countUpdate` keyframe.
- Reduced-motion overrides for custom keyframes are added to the existing `@media (prefers-reduced-motion: reduce)` block in the same file (see plan 003, or the original block at lines 239-243 if plan 003 hasn't been applied yet) — add `.animate-count-update` there following the same `animation: none !important` pattern as `.animate-fade-in`.
- React's `key` prop to force-remount-and-replay a CSS animation on data change has no prior exemplar in this repo, but is the standard idiom for this exact case (CSS animation replay on state change without a JS animation library) and requires no new dependency.

## Steps

1. Open `app/globals.css`, locate the `.animate-fade-in` block ending at line 237.
2. Add the new `@keyframes countUpdate` and `.animate-count-update` block immediately after it (before the reduced-motion media query at line 239).
3. In the same file, add `.animate-count-update` to the `prefers-reduced-motion: reduce` media query's selector list alongside `.animate-fade-in`.
4. Open `components/analytics/LiveVisitors.tsx`, locate the returned JSX at lines 42-50.
5. Wrap the count/label text (currently a bare text node `{count} {count === 1 ? 'visitor' : 'visitors'} now`) in a `<span key={count} className="animate-count-update inline-flex gap-1">...</span>` as shown in Target.

## Boundaries

- Do NOT change the polling interval, the `animate-ping` live-indicator dot, or any fetch/error-handling logic.
- Do NOT introduce a JS animation library or `useEffect`-based transition timer — CSS `key`-remount only.
- Do NOT apply this same pattern to other numeric displays (e.g. MetricsGrid) — this plan is scoped to `LiveVisitors.tsx` only.
- If `app/globals.css`'s reduced-motion block has already been modified by plan 003 when this plan is executed, add `.animate-count-update` to that existing selector list rather than recreating the media query block.

## Verification

- **Mechanical**: `npm run build` (or `npx tsc --noEmit`) — expect no new type errors.
- **Feel check**: run the app on a project with live traffic (or manually trigger a realtime API response change via DevTools network throttling/mocking), watch the LiveVisitors badge across a poll cycle:
  - The count fades/lifts in smoothly on each 10s update rather than popping instantly.
  - In DevTools Animations panel, set playback to 10% during a count change and confirm a single 150ms fade+translateY(-2px→0), not a flash.
  - Rapid successive count changes (e.g. mock two updates within 300ms) don't stack or visually overlap — each remount fully replaces the prior animation cleanly since React unmounts/remounts the keyed span.
  - Toggle `prefers-reduced-motion` (Rendering panel) and confirm the count still updates but with no animation (instant swap, matching the `.animate-count-update { animation: none }` override).
- **Done when**: the visitor count fades in on every value change instead of popping instantly, and reduced-motion users get an instant (non-animated) update instead.
