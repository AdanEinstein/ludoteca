// Groups clients that are probably in the same home (ADR 0002).
// Private IP = same LAN (local server); otherwise the public IP (IPv6 by /64, which is the whole home).
// ponytail: Snapdrop-style heuristic. Fails with VPN, CGNAT or a phone on 4G; the QR code covers those cases.
const PRIVATE = /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/;

export function networkKey(ip = ''): string {
  const address = ip.replace(/^::ffff:/, '');
  if (address === '::1' || /^(f[cd]|fe80)/i.test(address) || PRIVATE.test(address)) return 'lan';
  return address.includes(':') ? address.split(':').slice(0, 4).join(':') : address;
}
