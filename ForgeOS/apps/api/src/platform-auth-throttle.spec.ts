import { UnauthorizedException } from '@nestjs/common';
import { PlatformService } from './platform.service';

jest.mock('./password', () => ({
  hashPassword: jest.fn(async () => 'hash'),
  verifyPassword: jest.fn(async () => false),
}));

describe('PlatformService authentication throttling', () => {
  let service: PlatformService;
  let query: jest.Mock;

  beforeEach(() => {
    service = new PlatformService();
    query = jest.fn().mockResolvedValue({ rows: [] });
    (service as unknown as { pool: { query: jest.Mock } }).pool.query = query;
  });

  afterEach(async () => { await service.onModuleDestroy(); });

  it('limits password failures per normalized email without querying after the limit', async () => {
    for (let attempt = 0; attempt < 10; attempt++) {
      await expect(service.loginUser('QA@example.test', 'wrong-password')).rejects.toThrow(UnauthorizedException);
    }

    await expect(service.loginUser('qa@example.test', 'wrong-password')).rejects.toMatchObject({ status: 429 });
    expect(query).toHaveBeenCalledTimes(10);
  });

  it('limits WebAuthn option issuance per normalized email', async () => {
    for (let attempt = 0; attempt < 10; attempt++) {
      await service.webAuthnAuthenticationOptions('QA@example.test');
    }

    await expect(service.webAuthnAuthenticationOptions('qa@example.test')).rejects.toMatchObject({ status: 429 });
    expect(query).toHaveBeenCalledTimes(10);
  });
});
