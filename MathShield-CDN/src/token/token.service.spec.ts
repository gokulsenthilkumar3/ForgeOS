import { TokenService } from './token.service';

describe('challenge signatures', () => {
  const service = new TokenService({} as any, { get: () => 'test-secret' } as any);

  afterEach(() => jest.useRealTimers());

  it('accepts an untampered challenge throughout its ten-minute cache lifetime', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T12:00:00Z'));
    const signature = service.createChallengeSignature('challenge-1', 'arithmetic', 'easy');
    jest.setSystemTime(new Date('2026-01-01T12:09:00Z'));
    expect(service.verifyChallengeSignature('challenge-1', 'arithmetic', 'easy', signature)).toBe(true);
    expect(service.verifyChallengeSignature('challenge-2', 'arithmetic', 'easy', signature)).toBe(false);
  });
});
