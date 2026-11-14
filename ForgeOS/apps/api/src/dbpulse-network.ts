import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export function addressClass(ip: string): 'public' | 'private' | 'blocked' {
  if (isIP(ip) !== 4) return 'blocked';
  const [a, b] = ip.split('.').map(Number);
  if (a === 0 || a === 127 || a === 169 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 198 && [18, 19, 51].includes(b)) || (a === 192 && [0, 2].includes(b)) || (a === 203 && b === 0)) return 'blocked';
  if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return 'private';
  return 'public';
}
export async function resolveDbHost(host: string): Promise<{ address: string; private: boolean }> {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9.-]{0,252}$/.test(host) || host.endsWith('.') || isIP(host) === 6) throw new BadRequestException('Enter a hostname or IPv4 address, without a URL, path or credentials.');
  const reserved = ['localhost', 'api', 'web', 'postgres', 'redis', 'minio', 'mathshield', 'pulsewatch', 'host.docker.internal', 'gateway.docker.internal'];
  if (reserved.includes(host.toLowerCase())) throw new ForbiddenException('ForgeOS infrastructure cannot be used as a comparison source.');
  const allow = (process.env.FORGEOS_DBPULSE_PRIVATE_HOSTS || '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
  let addresses: string[];
  try { addresses = isIP(host) ? [host] : (await lookup(host, { family: 4, all: true })).map(v => v.address); }
  catch { throw new BadRequestException('Database hostname could not be resolved to IPv4.'); }
  if (!addresses.length || addresses.some(ip => addressClass(ip) === 'blocked' || (addressClass(ip) === 'private' && !allow.includes(host.toLowerCase())))) throw new ForbiddenException('Destination blocked. Private hosts require the operator-managed DB Pulse allowlist; loopback and metadata addresses are never allowed.');
  let platformHost = '';
  try { platformHost = new URL(process.env.DATABASE_URL || '').hostname; } catch { /* no configured database */ }
  if (platformHost) {
    let platformAddresses: string[] = [];
    try { platformAddresses = isIP(platformHost) ? [platformHost] : (await lookup(platformHost, { family: 4, all: true })).map(v => v.address); } catch { throw new ForbiddenException('Cannot verify separation from the ForgeOS database.'); }
    if (host.toLowerCase() === platformHost.toLowerCase() || addresses.some(ip => platformAddresses.includes(ip))) throw new ForbiddenException('The ForgeOS application database is not a comparison source.');
  }
  return { address: addresses[0], private: addressClass(addresses[0]) === 'private' };
}
