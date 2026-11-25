// Agrupa clientes que provavelmente estão na mesma casa.
// IP privado = mesma LAN (servidor local); senão IP público (IPv6 por /64, que é a casa toda).
// ponytail: heurística tipo Snapdrop. Falha com VPN, CGNAT ou celular em 4G; nesse caso o QR resolve.
const PRIVATE = /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/;

module.exports = function netKey(ip = '') {
  ip = ip.replace(/^::ffff:/, '');
  if (ip === '::1' || /^(f[cd]|fe80)/i.test(ip) || PRIVATE.test(ip)) return 'lan';
  return ip.includes(':') ? ip.split(':').slice(0, 4).join(':') : ip;
};
