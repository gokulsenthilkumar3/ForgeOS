import { RateLimitService } from '../src/rate-limit/rate-limit.service';

const mockConfig = { getOrThrow: jest.fn().mockReturnValue('redis://localhost:6379') };

// Mock ioredis pipeline
const pipelineResult = [[null, 1], [null, 'OK'], [null, 1], [null, 1]];
const mockPipeline = {
  zremrangebyscore: jest.fn().mockReturnThis(),
  zadd: jest.fn().mockReturnThis(),
  zcard: jest.fn().mockReturnThis(),
  expire: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(pipelineResult),
};
const mockRedis = {
  connect: jest.fn().mockResolvedValue(undefined),
  quit: jest.fn().mockResolvedValue(undefined),
  pipeline: jest.fn().mockReturnValue(mockPipeline),
  zremrangebyscore: jest.fn().mockResolvedValue(0),
  zcard: jest.fn().mockResolvedValue(1),
  del: jest.fn().mockResolvedValue(1),
};

jest.mock('ioredis', () => jest.fn().mockImplementation(() => mockRedis));

describe('RateLimitService', () => {
  let service: RateLimitService;

  beforeEach(async () => {
    service = new RateLimitService(mockConfig as any);
    await service.onModuleInit();
  });

  it('allows events within limit', async () => {
    const result = await service.checkTable('conn-1', 'users', 500);
    expect(result.allowed).toBe(true);
    expect(result.count).toBe(1);
  });

  it('blocks events over limit', async () => {
    mockPipeline.exec.mockResolvedValueOnce([[null, 1], [null, 'OK'], [null, 501], [null, 1]]);
    const result = await service.checkTable('conn-1', 'users', 500);
    expect(result.allowed).toBe(false);
    expect(result.count).toBe(501);
  });

  it('returns correct key format', async () => {
    const result = await service.checkTable('conn-abc', 'orders');
    expect(result.key).toBe('dbpulse:rate:conn-abc:orders');
  });
});
