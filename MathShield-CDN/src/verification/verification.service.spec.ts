import { VerificationService } from './verification.service';

describe('verification records', () => {
  const challenge = { id: 'challenge-1', type: 'arithmetic', difficulty: 'easy', answer: 5, timeLimit: 30, points: 1, signature: 'signed' };
  const challengeService = { getChallengeById: jest.fn().mockResolvedValue(challenge), removeChallenge: jest.fn().mockResolvedValue(true) };
  const riskService = { calculateRiskScore: jest.fn().mockReturnValue({ score: 10, level: 'low' }) };
  const tokenService = { verifyChallengeSignature: jest.fn().mockReturnValue(true), generateVerificationToken: jest.fn().mockResolvedValue({ token: 'signed-token' }) };
  const behaviorService = { analyze: jest.fn().mockReturnValue({ score: 80 }) };
  const analyticsService = { recordVerification: jest.fn().mockResolvedValue(undefined) };
  const service = new VerificationService(challengeService as any, riskService as any, tokenService as any, behaviorService as any, analyticsService as any);

  beforeEach(() => jest.clearAllMocks());

  it('persists the actual challenge and server-supplied request identity', async () => {
    const result = await service.verifyResponse({ challengeId: challenge.id, answer: '5', timeTaken: 5000 }, { ip: '198.51.100.7', userAgent: 'test-browser' });
    expect(result.success).toBe(true);
    expect(analyticsService.recordVerification).toHaveBeenCalledWith(expect.objectContaining({ challengeId: challenge.id, challengeType: 'arithmetic', difficulty: 'easy', success: true, timeTaken: 5000, ip: '198.51.100.7', userAgent: 'test-browser' }));
  });

  it('rejects invalid answers without consuming the challenge', async () => {
    await expect(service.verifyResponse({ challengeId: challenge.id, answer: null as any, timeTaken: 5000 })).rejects.toThrow();
    expect(challengeService.removeChallenge).not.toHaveBeenCalled();
  });

  it('uses server request identity instead of client-supplied IP risk factors', async () => {
    await service.verifyResponse({ challengeId: challenge.id, answer: '5', timeTaken: 5000, riskFactors: { ip: '1.1.1.1' } }, { ip: '198.51.100.7', userAgent: 'test-browser' });
    expect(riskService.calculateRiskScore).toHaveBeenCalledWith(expect.objectContaining({ ip: '198.51.100.7', userAgent: 'test-browser' }));
  });
});
