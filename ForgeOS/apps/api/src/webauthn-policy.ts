import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { isIP } from 'node:net';
import type { VerifiedRegistrationResponse } from '@simplewebauthn/server';
import { convertCertBufferToPEM, decodeAttestationObject, validateCertificatePath } from '@simplewebauthn/server/helpers';

const aaguidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type WebAuthnConfig = {
  rpID: string;
  origin: string;
  trustedRoots: string[];
  allowedAaguids: Set<string>;
};

/**
 * The API must not infer a production RP from proxy headers: those headers are
 * attacker-controlled unless every edge is configured perfectly.
 */
export function webAuthnConfig(env: NodeJS.ProcessEnv = process.env): WebAuthnConfig {
  const isProduction = env.NODE_ENV === 'production';
  const rpID = env.FORGEOS_WEBAUTHN_RP_ID?.trim().toLowerCase() || (isProduction ? '' : 'localhost');
  const origin = env.FORGEOS_WEBAUTHN_ORIGIN?.trim() || (isProduction ? '' : 'http://localhost:3000');
  let parsedOrigin: URL;
  try { parsedOrigin = new URL(origin); }
  catch { throw new ServiceUnavailableException('WebAuthn origin is not configured'); }
  const localhostHttp = !isProduction && rpID === 'localhost' && /^http:\/\/localhost:[0-9]+$/.test(origin);
  const invalidProductionRp = isProduction && (rpID === 'localhost' || rpID.endsWith('.localhost') || isIP(rpID) !== 0);
  if (!rpID || invalidProductionRp || !/^[a-z0-9.-]+$/.test(rpID) ||
      parsedOrigin.origin !== origin || parsedOrigin.username || parsedOrigin.password ||
      (parsedOrigin.protocol !== 'https:' && !localhostHttp) ||
      !(parsedOrigin.hostname === rpID || parsedOrigin.hostname.endsWith(`.${rpID}`))) {
    throw new ServiceUnavailableException('WebAuthn relying party is not configured');
  }
  let trustedRoots: string[] = [];
  if (env.FORGEOS_WEBAUTHN_ATTESTATION_ROOTS_PEM) {
    try {
      const parsed: unknown = JSON.parse(env.FORGEOS_WEBAUTHN_ATTESTATION_ROOTS_PEM);
      if (!Array.isArray(parsed) || !parsed.every(value => typeof value === 'string' && value.includes('-----BEGIN CERTIFICATE-----'))) throw new Error('roots');
      trustedRoots = parsed;
    } catch { throw new ServiceUnavailableException('WebAuthn trusted roots are invalid'); }
  }
  const allowedAaguids = new Set((env.FORGEOS_WEBAUTHN_ALLOWED_AAGUIDS || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean));
  if ([...allowedAaguids].some(value => !aaguidPattern.test(value))) throw new ServiceUnavailableException('WebAuthn AAGUID allowlist is invalid');
  return { rpID, origin, trustedRoots, allowedAaguids };
}

export function requireHardwarePolicy(config: WebAuthnConfig): void {
  if (!config.trustedRoots.length || !config.allowedAaguids.size) {
    throw new ServiceUnavailableException('Trusted physical-key attestation is not configured');
  }
}

export async function verifyHardwareAttestation(info: Extract<VerifiedRegistrationResponse, { verified: true }>['registrationInfo'], config: WebAuthnConfig): Promise<void> {
  requireHardwarePolicy(config);
  if (!info.userVerified || info.credentialDeviceType !== 'singleDevice' || info.credentialBackedUp ||
      info.fmt !== 'packed' || !config.allowedAaguids.has(info.aaguid.toLowerCase())) {
    throw new BadRequestException('The authenticator is not an approved physical security key');
  }
  const statement = decodeAttestationObject(info.attestationObject).get('attStmt');
  const certificates = statement.get('x5c');
  if (!certificates?.length) throw new BadRequestException('Full hardware attestation is required');
  try {
    const trusted = await validateCertificatePath(certificates.map(convertCertBufferToPEM), config.trustedRoots);
    if (!trusted) throw new Error('Untrusted attestation');
  } catch {
    throw new BadRequestException('Hardware attestation chain is not trusted');
  }
}
