import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import Providers from "./providers";
import { cn } from "@/lib/utils";
import { family } from "@/lib/fonts";

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
    <html lang="en" className={cn(family.variable)} suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground selection:bg-primary/20">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
