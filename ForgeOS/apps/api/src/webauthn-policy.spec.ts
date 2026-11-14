import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import type { VerifiedRegistrationResponse } from '@simplewebauthn/server';
import { convertCertBufferToPEM, decodeAttestationObject, validateCertificatePath } from '@simplewebauthn/server/helpers';
import { requireHardwarePolicy, verifyHardwareAttestation, webAuthnConfig } from './webauthn-policy';

jest.mock('@simplewebauthn/server/helpers', () => ({
  convertCertBufferToPEM: jest.fn(() => 'certificate'),
  decodeAttestationObject: jest.fn(() => new Map([['attStmt', new Map([['x5c', [new Uint8Array([1])]]])]])),
  validateCertificatePath: jest.fn(async () => true),
}));

const aaguid = '11111111-1111-4111-8111-111111111111';
const roots = JSON.stringify(['-----BEGIN CERTIFICATE-----\nexample\n-----END CERTIFICATE-----']);
const goodInfo = {
  fmt: 'packed',
  aaguid,
  credentialDeviceType: 'singleDevice',
  credentialBackedUp: false,
  userVerified: true,
  attestationObject: new Uint8Array([1]),
} as Extract<VerifiedRegistrationResponse, { verified: true }>['registrationInfo'];

describe('physical-key WebAuthn policy', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses localhost only in development, not as a production fallback', () => {
    expect(webAuthnConfig({ NODE_ENV: 'development' })).toMatchObject({ rpID: 'localhost', origin: 'http://localhost:3000' });
    expect(() => webAuthnConfig({ NODE_ENV: 'production' })).toThrow(ServiceUnavailableException);
    expect(() => webAuthnConfig({ NODE_ENV: 'production', FORGEOS_WEBAUTHN_RP_ID: 'example.com', FORGEOS_WEBAUTHN_ORIGIN: 'http://example.com' }))
      .toThrow(ServiceUnavailableException);
    expect(() => webAuthnConfig({ NODE_ENV: 'production', FORGEOS_WEBAUTHN_RP_ID: 'localhost', FORGEOS_WEBAUTHN_ORIGIN: 'http://localhost:3000' }))
      .toThrow(ServiceUnavailableException);
    expect(() => webAuthnConfig({
      NODE_ENV: 'production', FORGEOS_WEBAUTHN_RP_ID: 'localhost',
      FORGEOS_WEBAUTHN_ORIGIN: 'http://localhost:3000', FORGEOS_WEBAUTHN_ALLOW_LOCALHOST_HTTP: 'true',
    })).toThrow(ServiceUnavailableException);
    expect(() => webAuthnConfig({
      NODE_ENV: 'production', FORGEOS_WEBAUTHN_RP_ID: 'localhost',
      FORGEOS_WEBAUTHN_ORIGIN: 'https://localhost:3000',
    })).toThrow(ServiceUnavailableException);
    expect(() => webAuthnConfig({
      NODE_ENV: 'production', FORGEOS_WEBAUTHN_RP_ID: 'example.com',
      FORGEOS_WEBAUTHN_ORIGIN: 'http://example.com', FORGEOS_WEBAUTHN_ALLOW_LOCALHOST_HTTP: 'true',
    })).toThrow(ServiceUnavailableException);
    expect(webAuthnConfig({
      NODE_ENV: 'production', FORGEOS_WEBAUTHN_RP_ID: 'example.com',
      FORGEOS_WEBAUTHN_ORIGIN: 'https://example.com',
    })).toMatchObject({ rpID: 'example.com', origin: 'https://example.com' });
    expect(() => webAuthnConfig({
      NODE_ENV: 'production', FORGEOS_WEBAUTHN_RP_ID: '203.0.113.1',
      FORGEOS_WEBAUTHN_ORIGIN: 'https://203.0.113.1',
    })).toThrow(ServiceUnavailableException);
  });

  it('rejects missing trusted roots, missing AAGUIDs, and malformed origins', () => {
    expect(() => requireHardwarePolicy(webAuthnConfig({ NODE_ENV: 'development' }))).toThrow(ServiceUnavailableException);
    expect(() => webAuthnConfig({ NODE_ENV: 'development', FORGEOS_WEBAUTHN_ORIGIN: 'http://evil.example' })).toThrow(ServiceUnavailableException);
    expect(() => webAuthnConfig({ NODE_ENV: 'development', FORGEOS_WEBAUTHN_ALLOWED_AAGUIDS: 'not-a-guid' })).toThrow(ServiceUnavailableException);
  });

  it('rejects synced or backed-up keys before accepting attestation', async () => {
    const config = webAuthnConfig({ NODE_ENV: 'development', FORGEOS_WEBAUTHN_ATTESTATION_ROOTS_PEM: roots, FORGEOS_WEBAUTHN_ALLOWED_AAGUIDS: aaguid });
    await expect(verifyHardwareAttestation({ ...goodInfo, credentialDeviceType: 'multiDevice' }, config)).rejects.toThrow(BadRequestException);
    await expect(verifyHardwareAttestation({ ...goodInfo, credentialBackedUp: true }, config)).rejects.toThrow(BadRequestException);
    await expect(verifyHardwareAttestation({ ...goodInfo, fmt: 'none' }, config)).rejects.toThrow(BadRequestException);
    expect(decodeAttestationObject).not.toHaveBeenCalled();
  });

  it('requires a full attestation chain to an explicit trusted root', async () => {
    const config = webAuthnConfig({ NODE_ENV: 'development', FORGEOS_WEBAUTHN_ATTESTATION_ROOTS_PEM: roots, FORGEOS_WEBAUTHN_ALLOWED_AAGUIDS: aaguid });
    await expect(verifyHardwareAttestation(goodInfo, config)).resolves.toBeUndefined();
    expect(convertCertBufferToPEM).toHaveBeenCalled();
    expect(validateCertificatePath).toHaveBeenCalledWith(['certificate'], config.trustedRoots);
    jest.mocked(validateCertificatePath).mockRejectedValueOnce(new Error('bad chain'));
    await expect(verifyHardwareAttestation(goodInfo, config)).rejects.toThrow(BadRequestException);
  });
});
