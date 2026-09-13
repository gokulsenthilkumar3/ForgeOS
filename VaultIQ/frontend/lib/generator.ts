/**
 * VaultIQ Password & Passphrase Generator
 */

const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
const AMBIGUOUS = new Set(['i', 'l', '1', 'L', 'o', '0', 'O', 'I']);

const WORDLIST = [
  'apple', 'brave', 'cloud', 'dance', 'eagle', 'flame', 'grace', 'haven',
  'ivory', 'jewel', 'knack', 'lemon', 'maple', 'night', 'ocean', 'pearl',
  'quill', 'river', 'storm', 'tiger', 'unity', 'vivid', 'whale', 'xenon',
  'yacht', 'zebra', 'amber', 'blaze', 'coral', 'dusk', 'ember', 'frost',
  'glade', 'haze', 'indie', 'jade', 'karma', 'lunar', 'misty', 'noble',
  'opal', 'prism', 'quest', 'radiant', 'solar', 'tidal', 'urban', 'vast',
  'willow', 'yonder', 'zephyr', 'aurora', 'basin', 'cedar', 'delta',
  'echo', 'fable', 'giant', 'heron', 'iris', 'jumper', 'kelp', 'lantern',
  'mossy', 'nimbus', 'orbit', 'pebble', 'quartz', 'raven', 'sapphire',
  'topaz', 'umber', 'vortex', 'wonder', 'cobalt', 'dagger', 'ferret',
];

export interface PasswordOptions {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  excludeAmbiguous: boolean;
  customSymbols?: string;
}

export interface PassphraseOptions {
  wordCount: number;
  separator: '-' | ' ' | '.' | '_';
  capitalize: boolean;
  includeNumber: boolean;
}

export function generatePassword(options: PasswordOptions): string {
  const {
    length = 16,
    includeUppercase = true,
    includeLowercase = true,
    includeNumbers = true,
    includeSymbols = true,
    excludeAmbiguous = false,
    customSymbols,
  } = options;

  let charset = '';
  const guaranteed: string[] = [];

  if (includeLowercase) {
    const chars = excludeAmbiguous
      ? LOWERCASE.split('').filter((c) => !AMBIGUOUS.has(c)).join('')
      : LOWERCASE;
    charset += chars;
    guaranteed.push(chars[secureRandInt(chars.length)]);
  }

  if (includeUppercase) {
    const chars = excludeAmbiguous
      ? UPPERCASE.split('').filter((c) => !AMBIGUOUS.has(c)).join('')
      : UPPERCASE;
    charset += chars;
    guaranteed.push(chars[secureRandInt(chars.length)]);
  }

  if (includeNumbers) {
    const chars = excludeAmbiguous
      ? NUMBERS.split('').filter((c) => !AMBIGUOUS.has(c)).join('')
      : NUMBERS;
    charset += chars;
    guaranteed.push(chars[secureRandInt(chars.length)]);
  }

  if (includeSymbols) {
    const chars = customSymbols || SYMBOLS;
    charset += chars;
    guaranteed.push(chars[secureRandInt(chars.length)]);
  }

  if (!charset) charset = LOWERCASE;

  // Fill remaining length
  const remaining = length - guaranteed.length;
  const filler = Array.from({ length: Math.max(0, remaining) }, () =>
    charset[secureRandInt(charset.length)],
  );

  // Shuffle guaranteed + filler together
  const all = [...guaranteed, ...filler];
  secureShuffle(all);

  return all.slice(0, length).join('');
}

export function generatePassphrase(options: PassphraseOptions): string {
  const { wordCount = 4, separator = '-', capitalize = true, includeNumber = true } = options;

  const words = Array.from({ length: wordCount }, () => {
    const word = WORDLIST[secureRandInt(WORDLIST.length)];
    return capitalize ? word.charAt(0).toUpperCase() + word.slice(1) : word;
  });

  if (includeNumber) {
    const num = secureRandInt(999).toString();
    const pos = secureRandInt(words.length);
    words.splice(pos, 0, num);
  }

  return words.join(separator);
}

export function generatePin(length: number = 6): string {
  return Array.from({ length }, () => secureRandInt(10).toString()).join('');
}

export function generateUsername(): string {
  const adjectives = [
    'Swift', 'Bold', 'Bright', 'Calm', 'Clear', 'Cool', 'Dark', 'Deep',
    'Fast', 'Free', 'Gold', 'Grand', 'Gray', 'Great', 'Hard', 'High',
    'Iron', 'Just', 'Kind', 'Last', 'Loud', 'Mild', 'Near', 'Nice',
  ];
  const nouns = [
    'Fox', 'Hawk', 'Lion', 'Wolf', 'Bear', 'Crane', 'Deer', 'Eagle',
    'Falcon', 'Goat', 'Horse', 'Jay', 'Kite', 'Lynx', 'Moose', 'Newt',
    'Owl', 'Pike', 'Rook', 'Seal', 'Teal', 'Wren', 'Yak', 'Zebra',
  ];
  const adj = adjectives[secureRandInt(adjectives.length)];
  const noun = nouns[secureRandInt(nouns.length)];
  const num = secureRandInt(9999).toString().padStart(4, '0');
  return `${adj}${noun}${num}`;
}

// -------------------------------------------------------------------------
// Cryptographically secure random helpers
// -------------------------------------------------------------------------

function secureRandInt(max: number): number {
  const array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  return array[0] % max;
}

function secureShuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = secureRandInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
