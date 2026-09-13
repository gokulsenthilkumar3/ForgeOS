import { AlertsService, AlertCondition } from '../src/alerts/alerts.service';
import { AuditEvent } from '@dbpulse/shared';

const mockConfig = { getOrThrow: jest.fn().mockReturnValue('http://mock') };
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: [], error: null }),
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabase,
}));

const makeEvent = (overrides: Partial<AuditEvent> = {}): AuditEvent => ({
  id: 'evt-1',
  connectionId: 'conn-1',
  databaseName: 'mydb',
  tableName: 'users',
  operation: 'DELETE',
  actor: 'admin',
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe('AlertsService — condition matching', () => {
  let service: AlertsService;

  beforeEach(() => {
    service = new AlertsService(mockConfig as any);
  });

  const match = (event: AuditEvent, conditions: AlertCondition[]) =>
    (service as any).matchesAllConditions(event, conditions);

  it('eq — matches when field equals value', () => {
    expect(match(makeEvent(), [{ field: 'operation', op: 'eq', value: 'DELETE' }])).toBe(true);
  });

  it('eq — does not match when field differs', () => {
    expect(match(makeEvent(), [{ field: 'operation', op: 'eq', value: 'INSERT' }])).toBe(false);
  });

  it('neq — matches when field differs', () => {
    expect(match(makeEvent(), [{ field: 'operation', op: 'neq', value: 'INSERT' }])).toBe(true);
  });

  it('contains — matches substring', () => {
    expect(match(makeEvent({ tableName: 'users_archive' }), [
      { field: 'tableName', op: 'contains', value: 'archive' },
    ])).toBe(true);
  });

  it('in — matches value in array', () => {
    expect(match(makeEvent(), [
      { field: 'operation', op: 'in', value: ['DELETE', 'TRUNCATE'] },
    ])).toBe(true);
  });

  it('in — does not match value outside array', () => {
    expect(match(makeEvent({ operation: 'INSERT' }), [
      { field: 'operation', op: 'in', value: ['DELETE', 'TRUNCATE'] },
    ])).toBe(false);
  });

  it('any — always matches', () => {
    expect(match(makeEvent(), [{ field: 'actor', op: 'any', value: '' }])).toBe(true);
  });

  it('AND logic — all conditions must match', () => {
    expect(match(makeEvent(), [
      { field: 'operation', op: 'eq', value: 'DELETE' },
      { field: 'tableName', op: 'eq', value: 'users' },
      { field: 'actor',     op: 'eq', value: 'admin' },
    ])).toBe(true);
  });

  it('AND logic — fails if one condition does not match', () => {
    expect(match(makeEvent(), [
      { field: 'operation', op: 'eq', value: 'DELETE' },
      { field: 'actor',     op: 'eq', value: 'readonly' },  // wrong
    ])).toBe(false);
  });
});
