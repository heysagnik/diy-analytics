# 001 — Stop animating Sidebar width, use transform-only collapse

- **Status**: DONE
- **Commit**: 51b7e21
- **Severity**: HIGH
- **Category**: Performance
- **Estimated scope**: 1 file, small

## Problem

`components/project/Sidebar.tsx:53` transitions `width` alongside `transform` and `border-color` on every collapse/expand of the desktop sidebar. `width` is a layout property — animating it forces the browser to recompute layout on every frame of the transition (not just paint/composite), which is the classic layout-thrash pattern and will visibly stutter, especially on lower-end devices, since the sidebar toggle is a moderately frequent interaction.

Current code:

```tsx
// components/project/Sidebar.tsx:53 — current
<aside
  className={`fixed inset-y-0 left-0 z-50 lg:static flex flex-col h-screen flex-shrink-0 overflow-hidden transition-[transform,width,border-color] duration-300 ease-in-out ${
    isCollapsed
      ? "lg:w-0 lg:border-r-0"
      : "lg:w-64 border-r border-border bg-surface"
  } w-64 border-r border-border bg-surface ${
    isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
  }`}
```

## Target

Replace the animated `width` with a fixed-width sidebar whose collapse is driven by `transform` only. Since `overflow-hidden` is already present on the `<aside>`, sliding it out via `translateX(-100%)` on the collapsed state produces the same visual collapse without a layout-triggering property, and border-color can transition as before (it's paint-only, not layout).

```tsx
// target
<aside
  className={`fixed inset-y-0 left-0 z-50 lg:static flex flex-col h-screen w-64 flex-shrink-0 overflow-hidden border-r border-border bg-surface transition-transform duration-300 ease-in-out ${
    isCollapsed ? "lg:-translate-x-full" : "lg:translate-x-0"
  } ${
    isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
  }`}
  style={isCollapsed ? { marginRight: "-16rem" } : undefined}
/>
```

The `marginRight: -16rem` (matching `w-64` = 16rem) pulls the following flex sibling back into the space the sidebar no longer visually occupies, since `<aside>` stays `w-64` at all times now and only its transform moves it off-screen — `margin` here is set directly via inline style with no transition, so it does not animate (avoiding reintroducing a layout-property animation). If `margin` also needs to animate for a smoother reflow of the adjacent content, that must go through `transform`/width on the *sibling* flex container instead, not this file — out of scope for this plan; flag to the user if the plain `translateX` collapse without margin adjustment looks visually wrong (e.g. leaves a persistent 16rem gap on desktop when collapsed) rather than improvising.

## Repo conventions to follow

- Duration/easing tokens are not centralized in this repo — durations and easings are hand-typed Tailwind utility classes (`duration-300 ease-in-out`) inline. Keep `duration-300 ease-in-out` as-is; this plan only removes `width` from the transitioned property list, not the timing.
- `app/projects/[slugs]/layout.tsx:193` uses a similar `transition-opacity duration-300` pattern for its own layout-adjacent overlay — no exemplar for transform-only sidebar collapse exists yet in the repo, so this plan establishes the pattern.

## Steps

1. Open `components/project/Sidebar.tsx`, locate the `<aside>` element at line 52-59.
2. Replace the `transition-[transform,width,border-color]` utility with `transition-transform`.
3. Remove `lg:w-0 lg:border-r-0` from the `isCollapsed` branch; keep the `<aside>` at a constant `w-64 border-r border-border bg-surface` regardless of collapsed state.
4. Add `lg:-translate-x-full` to the `isCollapsed` branch (parallel to the existing mobile `isOpen ? ... : "-translate-x-full lg:translate-x-0"` logic) so collapsing the sidebar slides it out via transform instead of shrinking its width.
5. Read the parent layout at `app/projects/[slugs]/layout.tsx` around where `<Sidebar collapsed=... />` is rendered (near line 199) to see how the collapsed sidebar's vacated space is currently handled by sibling elements. If the sibling relies on the sidebar's `width: 0` to reflow, apply the `marginRight: "-16rem"` inline style approach from the Target section conditionally in Sidebar.tsx, OR report back if a different mechanism is needed — do not guess a layout fix for the parent beyond what's specified here.
6. Verify no other code reads or depends on the sidebar's animated `width` (e.g. a ResizeObserver) via a grep for `Sidebar` usage.

## Boundaries

- Do NOT touch `app/projects/[slugs]/layout.tsx` beyond reading it to confirm the collapse mechanism still visually works; if it needs a code change, stop and report rather than editing it, since that file has its own separate finding (see plan 003/backlog).
- Do NOT change the mobile (`isOpen`) slide-in/out behavior — only the desktop (`lg:`) collapsed-state mechanism.
- Do NOT add new dependencies or a ResizeObserver.
- If the code at `components/project/Sidebar.tsx:52-59` has drifted from the excerpt above (different class ordering, different collapse variable names), stop and report instead of improvising.

## Verification

- **Mechanical**: `npm run build` (or `npx tsc --noEmit` if build is slow) — expect no new type errors.
- **Feel check**: run the app, open a project, toggle the desktop sidebar collapse button repeatedly:
  - The sidebar slides off-screen smoothly with no visible content reflow "jump" mid-animation.
  - In DevTools Performance panel, record a collapse toggle and confirm there are no purple "Layout" bars during the 300ms transition (only "Composite Layers").
  - In DevTools Animations panel, set playback to 10% and confirm the slide reads as a single smooth transform, not a width-shrink.
  - Toggle `prefers-reduced-motion` (Rendering panel) — the collapse should still functionally happen (feature, not decoration) since this transition indicates state, not decoration; motion is acceptable to keep per AUDIT.md ("keep transitions that aid comprehension").
- **Done when**: sidebar collapse/expand no longer animates `width`, Performance panel shows no Layout recalculation during the transition, and the mobile slide-in/out behavior is unchanged.
