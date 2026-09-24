import { AnalyticsService } from './analytics.service';

describe('verification analytics persistence', () => {
  it('stores the real challenge identity and difficulty', async () => {
    const repository = { create: jest.fn(data => data), save: jest.fn().mockResolvedValue(undefined) };
    const service = new AnalyticsService(repository as any);
    await service.recordVerification({ challengeId: 'challenge-1', challengeType: 'arithmetic', difficulty: 'hard', success: true, timeTaken: 3000, riskScore: 10 });
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ challengeId: 'challenge-1', difficulty: 'hard', success: true }));
    expect(repository.save).toHaveBeenCalled();
  });

  it('keeps separate hourly buckets across days and bounds requested history', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-02T12:30:00Z'));
    try {
      const records = [
        { createdAt: new Date('2026-01-01T11:15:00Z'), success: false, timeTaken: 1000 },
        { createdAt: new Date('2026-01-02T11:15:00Z'), success: true, timeTaken: 3000 },
      ];
      const query = { where: jest.fn().mockReturnThis(), getMany: jest.fn().mockResolvedValue(records) };
      const repository = { createQueryBuilder: jest.fn().mockReturnValue(query) };
      const service = new AnalyticsService(repository as any);
      const data = await service.getTimeSeriesData(27);
      expect(data).toHaveLength(27);
      expect(data.filter(bucket => bucket.verifications)).toEqual([
        expect.objectContaining({ timestamp: new Date('2026-01-01T11:00:00Z'), failures: 1, averageTime: 1000 }),
        expect.objectContaining({ timestamp: new Date('2026-01-02T11:00:00Z'), successes: 1, averageTime: 3000 }),
      ]);
      expect(await service.getTimeSeriesData(100_000)).toHaveLength(168);
    } finally { jest.useRealTimers(); }
  });
});
