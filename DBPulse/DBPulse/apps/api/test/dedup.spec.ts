import { DedupService } from '../src/events/dedup.service';

const mockConfig = { getOrThrow: jest.fn().mockReturnValue('redis://localhost:6379') };

const mockRedis = {
  connect: jest.fn().mockResolvedValue(undefined),
  quit: jest.fn().mockResolvedValue(undefined),
  set: jest.fn(),
  del: jest.fn().mockResolvedValue(1),
};

jest.mock('ioredis', () => jest.fn().mockImplementation(() => mockRedis));

describe('DedupService', () => {
  let service: DedupService;

  beforeEach(async () => {
    service = new DedupService(mockConfig as any);
    await service.onModuleInit();
    jest.clearAllMocks();
  });

  it('returns true (new) when Redis SET NX succeeds', async () => {
    mockRedis.set.mockResolvedValue('OK');
    expect(await service.isNew('hash-abc')).toBe(true);
  });

  it('returns false (duplicate) when Redis SET NX returns null', async () => {
    mockRedis.set.mockResolvedValue(null);
    expect(await service.isNew('hash-abc')).toBe(false);
  });

  it('always allows events with no hash', async () => {
    expect(await service.isNew('')).toBe(true);
    expect(mockRedis.set).not.toHaveBeenCalled();
  });

  it('release deletes the dedup key', async () => {
    await service.release('hash-abc');
    expect(mockRedis.del).toHaveBeenCalledWith('dbpulse:dedup:hash-abc');
  });
});
