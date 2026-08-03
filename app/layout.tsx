import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import Providers from "./providers";
import { cn } from "@/lib/utils";

// Linear treats display and body as one voice — Inter is the documented
// open-source substitute for Linear Display / Linear Text (design.md).
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DIY Analytics",
  description: "Privacy-friendly, self-hosted website analytics. Deploy to Vercel in three steps.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn(inter.variable)} suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground selection:bg-primary/20">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
