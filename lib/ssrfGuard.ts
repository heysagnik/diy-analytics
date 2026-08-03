import dns from 'node:dns';

/**
 * Blocks outbound requests to loopback/private/link-local/multicast
 * addresses so a server-side webhook fetch (alert delivery) can't be used
 * to reach internal services, cloud metadata endpoints, or other hosts on
 * the deployment's private network. Checked against the *resolved* IP(s),
 * not just the hostname, since DNS is attacker-influenceable (rebinding).
 */
export class UnsafeWebhookUrlError extends Error {}

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true; // link-local + cloud metadata (169.254.169.254)
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  if (a >= 224) return true; // multicast/reserved
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::1') return true; // loopback
  if (lower.startsWith('::ffff:')) return isPrivateIPv4(lower.slice(7)); // IPv4-mapped
  if (lower.startsWith('fe80:')) return true; // link-local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local (fc00::/7)
  if (lower === '::') return true;
  return false;
}

export function isPrivateAddress(ip: string): boolean {
  return ip.includes(':') ? isPrivateIPv6(ip) : isPrivateIPv4(ip);
}

export async function assertSafeWebhookUrl(rawUrl: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsafeWebhookUrlError('Webhook URL is not a valid URL');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UnsafeWebhookUrlError('Webhook URL must use http or https');
  }
  if (url.username || url.password) {
    throw new UnsafeWebhookUrlError('Webhook URL must not contain credentials');
  }

  const hostname = url.hostname;
  if (hostname === 'localhost') {
    throw new UnsafeWebhookUrlError('Webhook URL must not target localhost');
  }

  let addresses: string[];
  try {
    const results = await dns.promises.lookup(hostname, { all: true });
    addresses = results.map((r) => r.address);
  } catch {
    throw new UnsafeWebhookUrlError('Webhook URL hostname could not be resolved');
  }

  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new UnsafeWebhookUrlError('Webhook URL resolves to a private or reserved address');
  }
}
