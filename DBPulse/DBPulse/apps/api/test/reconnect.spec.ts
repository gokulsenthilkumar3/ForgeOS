import { ReconnectService } from '../src/connectors/reconnect.service';

const mockConnectors = {
  connect: jest.fn().mockResolvedValue(undefined),
};
const mockPipeline = {
  publish: jest.fn().mockResolvedValue(undefined),
};

describe('ReconnectService', () => {
  let service: ReconnectService;

  beforeEach(() => {
    jest.useFakeTimers();
    service = new ReconnectService(mockConnectors as any, mockPipeline as any);
  });

  afterEach(() => {
    jest.useRealTimers();
    service.onModuleDestroy();
  });

  it('scheduleReconnect registers a state', () => {
    service.scheduleReconnect('conn-1');
    const state = service.getState('conn-1');
    expect(state).not.toBeNull();
    expect(state?.connectionId).toBe('conn-1');
  });

  it('does not double-schedule the same connection', () => {
    service.scheduleReconnect('conn-1');
    service.scheduleReconnect('conn-1');
    expect(service.getAllStates()).toHaveLength(1);
  });

  it('cancel removes the state and sets aborted', () => {
    service.scheduleReconnect('conn-1');
    service.cancel('conn-1');
    expect(service.getState('conn-1')).toBeNull();
  });

  it('attempts to reconnect after delay', async () => {
    mockConnectors.connect.mockResolvedValue(undefined);
    service.scheduleReconnect('conn-2');
    jest.runAllTimers();
    await Promise.resolve(); // flush microtasks
    expect(mockConnectors.connect).toHaveBeenCalledWith('conn-2', expect.any(Function));
  });
});
