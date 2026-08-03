# 003 — Extend prefers-reduced-motion coverage beyond .animate-fade-in

- **Status**: DONE
- **Commit**: 51b7e21
- **Severity**: HIGH
- **Category**: Accessibility
- **Estimated scope**: 1 file (globals.css), small

## Problem

`app/globals.css:239-243` gates only the custom `.animate-fade-in` keyframe behind `prefers-reduced-motion: reduce`. Every other animation in the app — `animate-spin` (loading spinners), `animate-pulse`/`animate-ping` (live-visitor badge, skeletons), Recharts `animationDuration` chart draw-ins, and every Tailwind `transition-*` utility class (dropdown/dialog/select opens via tw-animate-css `data-open:animate-in`/`zoom-in-95`, sidebar collapse, page-transition opacity dips) — is completely unguarded. A user with `prefers-reduced-motion: reduce` set gets full motion exposure across the entire app except one fade-in.

Current code:

```css
/* app/globals.css:225-243 — current */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fade-in {
  animation: fadeIn 0.3s ease-out both;
}

@media (prefers-reduced-motion: reduce) {
  .animate-fade-in {
    animation: none !important;
  }
}
```

## Target

Add a global reduced-motion rule that shortens all CSS transitions/animations to near-zero by default (AUDIT.md §6: "fewer and gentler animations, not zero" — keep opacity/color feedback, drop movement/duration). This covers every Tailwind `transition-*` utility and CSS `@keyframes` animation site-wide without touching individual component files. Recharts' JS-driven `animationDuration` props are out of scope for this CSS-only plan (Recharts doesn't read CSS media queries) — flagged as a follow-up, not fixed here.

```css
/* target — app/globals.css, replace the block at lines 239-243 */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  .animate-fade-in {
    animation: none !important;
  }
}
```

Note: `animation-duration: 0.01ms` (not `0ms`) is deliberate — some browsers treat a `0ms` animation-duration as "no animation ran," which can skip `animationend`/`transitionend` event firing that component logic (e.g. `app/projects/[slugs]/layout.tsx:144-148`'s `setTimeout`-driven `isPageTransitioning` state, or any future `onTransitionEnd` handler) may depend on. Keeping the `.animate-fade-in { animation: none !important; }` override ensures that rule still wins for elements matching both rules (it's more specific and already `!important`, so no ordering conflict, but keep it for clarity/no regression).

## Repo conventions to follow

- All global CSS lives in `app/globals.css`; no separate tokens/media-query file exists. Add this rule immediately after the existing `.animate-fade-in` reduced-motion block (same location, same file) to keep all reduced-motion logic co-located.
- The existing block is the only exemplar of reduced-motion handling in the repo — this plan extends it in place rather than introducing a new pattern.

## Steps

1. Open `app/globals.css`, locate the `@media (prefers-reduced-motion: reduce)` block at lines 239-243.
2. Replace it with the target block above: add the universal selector rule (`*, *::before, *::after`) with `animation-duration`, `animation-iteration-count`, `transition-duration`, and `scroll-behavior` overrides, keeping the existing `.animate-fade-in { animation: none !important; }` rule inside the same media query block.
3. Do not touch any component `.tsx` file — this is a single-file, CSS-only change.

## Boundaries

- Do NOT attempt to gate Recharts' `animationDuration` props (BarChart.tsx:211, AreaChart.tsx:219, and the tooltip `animationDuration={150}` instances) behind reduced-motion in this plan — that requires a JS-side `useReducedMotion()`-style hook reading `window.matchMedia('(prefers-reduced-motion: reduce)')` and conditionally passing `animationDuration={0}` to each Recharts component, which is a separate, larger change touching multiple chart files. Report it as a follow-up finding if asked, but do not implement it here.
- Do NOT remove or weaken the existing `.animate-fade-in` reduced-motion override.
- Do NOT add a `useReducedMotion` React hook or any JS in this plan — CSS media query only.
- If `app/globals.css` has drifted (different line numbers, the reduced-motion block already extended by someone else), stop and report instead of improvising.

## Verification

- **Mechanical**: `npm run build` — expect no errors (pure CSS change, no type impact).
- **Feel check**: run the app with DevTools open, toggle the Rendering panel's "Emulate CSS media feature prefers-reduced-motion: reduce":
  - Trigger the sidebar collapse (Sidebar.tsx) — it should still functionally collapse but near-instantly, no 300ms slide.
  - Open a dropdown (ProjectSelector, DateRangePicker, select.tsx) — it should appear near-instantly, no fade/zoom.
  - Trigger a loading spinner (`animate-spin` on the users page refresh button) — confirm it either stops or completes its rotation near-instantly per iteration (spin animations with `animation-iteration-count: infinite` will still loop, just check they aren't jarring — this is an acceptable known limitation of the blanket rule, not a bug to fix here).
  - Toggle back to normal motion and confirm all animations return to their original durations — the media query must not affect the default (non-reduced-motion) experience at all.
- **Done when**: with `prefers-reduced-motion: reduce` emulated, all CSS-driven transitions/animations across the app (sidebar, dropdowns, dialogs, page-transition opacity dip) complete near-instantly, and with it disabled, behavior is pixel-identical to before this change.
