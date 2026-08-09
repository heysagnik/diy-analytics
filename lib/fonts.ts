import localFont from "next/font/local";

// Same typeface as the marketing site (diy-jet.vercel.app) — files copied
// from its self-hosted woff2s. Feeds --font-sans site-wide, same slot Inter
// occupied before.
export const family = localFont({
  src: [
    { path: "../app/fonts/Family-Regular.woff2", weight: "400", style: "normal" },
    { path: "../app/fonts/Family-Medium.woff2", weight: "500", style: "normal" },
    {
      path: "../app/fonts/Family-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-sans",
  display: "swap",
});
