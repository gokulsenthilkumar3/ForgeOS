import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const cost = 16384;
const blockSize = 8;
const parallelization = 1;
const keyLength = 64;

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, { N: cost, r: blockSize, p: parallelization }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await derive(password, salt);
  return `scrypt$${cost}$${blockSize}$${parallelization}$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, encodedCost, encodedBlockSize, encodedParallelization, encodedSalt, encodedHash] = encoded.split('$');
  if (algorithm !== 'scrypt' || Number(encodedCost) !== cost || Number(encodedBlockSize) !== blockSize || Number(encodedParallelization) !== parallelization || !encodedSalt || !encodedHash) return false;
  const salt = Buffer.from(encodedSalt, 'base64url');
  const expected = Buffer.from(encodedHash, 'base64url');
  if (salt.length !== 16 || expected.length !== keyLength) return false;
  const actual = await derive(password, salt);
  return timingSafeEqual(actual, expected);
}
