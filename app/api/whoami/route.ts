import { NextResponse } from 'next/server';

// Unauthenticated: only echoes the caller's own IP so the dashboard can
// offer a "don't track my visits" toggle without leaking visitor IPs.
//
// x-forwarded-for/x-real-ip are only trustworthy if the deployment's
// reverse proxy/edge network overwrites them (Vercel, most managed
// platforms do). Behind a plain self-hosted reverse proxy that forwards
// client-supplied headers verbatim, a caller can spoof this value — the
// worst case is a visitor excluding a spoofed IP from their own tracking,
// not a privileged security boundary, so this is left as documented
// best-effort rather than requiring deployment-specific trusted-proxy
// configuration here.
export async function GET(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || '';
  return NextResponse.json({ ip });
}
