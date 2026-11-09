import { AuthenticationThrottle } from './authentication-throttle';

describe('AuthenticationThrottle', () => {
  it('limits attempts within a window and allows requests after expiry', () => {
    const throttle = new AuthenticationThrottle(2, 1_000);
    expect(throttle.record('account', 100)).toBeUndefined();
    expect(throttle.record('account', 200)).toBeUndefined();
    expect(throttle.check('account', 300)).toBe(1);
    expect(throttle.record('account', 1_100)).toBeUndefined();
  });

  it('keeps identities isolated, supports clearing after successful authentication, and bounds memory', () => {
    const throttle = new AuthenticationThrottle(1, 1_000, 2);
    throttle.record('first', 100);
    expect(throttle.record('second', 100)).toBeUndefined();
    throttle.record('third', 100);
    expect(throttle.check('first', 200)).toBeUndefined();
    expect(throttle.check('second', 200)).toBe(1);
    throttle.reset('second');
    expect(throttle.check('second', 200)).toBeUndefined();
  });

  it('reserves concurrent attempts and only clears failures that predate a successful reservation', () => {
    const throttle = new AuthenticationThrottle(3, 1_000);
    throttle.record('account', 100);
    const successfulAttempt = throttle.reserve('account', 200)!;
    const concurrentAttempt = throttle.reserve('account', 200)!;

    throttle.complete('account', successfulAttempt, true, 300);
    expect(throttle.reserve('account', 300)).toBeDefined();
    expect(throttle.reserve('account', 300)).toBeDefined();
    expect(throttle.reserve('account', 300)).toBeUndefined();

    throttle.complete('account', concurrentAttempt, false, 400);
    expect(throttle.check('account', 400)).toBe(1);
  });
});
