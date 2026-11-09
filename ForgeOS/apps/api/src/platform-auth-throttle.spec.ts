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

  it('reserves password attempts before concurrent database lookups yield', async () => {
    const pendingQueries: ((value: { rows: never[] }) => void)[] = [];
    query.mockImplementation(() => new Promise(resolve => pendingQueries.push(resolve)));

    const attempts = Array.from({ length: 12 }, () =>
      service.loginUser('qa@example.test', 'wrong-password').then(() => null, error => error),
    );

    expect(query).toHaveBeenCalledTimes(10);
    pendingQueries.forEach(resolve => resolve({ rows: [] }));
    const results = await Promise.all(attempts);
    expect(results.filter(result => result instanceof UnauthorizedException)).toHaveLength(10);
    expect(results.filter(result => (result as { status?: number } | null)?.status === 429)).toHaveLength(2);
  });

  it('limits WebAuthn option issuance per normalized email', async () => {
    for (let attempt = 0; attempt < 10; attempt++) {
      await service.webAuthnAuthenticationOptions('QA@example.test');
    }

    await expect(service.webAuthnAuthenticationOptions('qa@example.test')).rejects.toMatchObject({ status: 429 });
    expect(query).toHaveBeenCalledTimes(10);
  });
});
