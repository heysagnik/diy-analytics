import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from 'react-hot-toast';
import Providers from "./providers"; // Import the Providers component

// Configure Manrope font from local files
const manrope = localFont({
  src: [
    {
      path: '../public/fonts/Manrope-ExtraLight.woff2',
      weight: '200',
      style: 'normal',
    },
    {
      path: '../public/fonts/Manrope-Light.woff2',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../public/fonts/Manrope-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/Manrope-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../public/fonts/Manrope-SemiBold.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../public/fonts/Manrope-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../public/fonts/Manrope-ExtraBold.woff2',
      weight: '800',
      style: 'normal',
    },
  ],
  variable: '--font-manrope',
  display: 'swap',
});

// For monospace content, you could either:
// 1. Keep using Geist Mono
// import { Geist_Mono } from "next/font/google";
// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });
// Or 2. Remove it if not needed

export const metadata: Metadata = {
  title: "diy-analytics",
  description: "A simple, self-hosted analytics solution",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${manrope.variable} antialiased bg-white text-black`} 
      >
        <Providers> {/* Wrap children with Providers */}
          <Toaster position="top-center" reverseOrder={false} />
          {children}
        </Providers>
      </body>
    </html>
  );
}
