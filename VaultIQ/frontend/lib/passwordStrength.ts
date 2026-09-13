/**
 * VaultIQ Password Strength Analysis
 * Computes Shannon entropy, detects patterns, estimates crack time.
 */

export type StrengthLevel = 'very-weak' | 'weak' | 'fair' | 'good' | 'strong';

export interface StrengthResult {
  score: number;        // 0-100
  level: StrengthLevel;
  entropy: number;      // bits
  crackTime: string;    // human readable
  suggestions: string[];
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumbers: boolean;
  hasSymbols: boolean;
  length: number;
}

const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', '123456', '123456789', 'qwerty',
  'abc123', 'letmein', 'monkey', 'dragon', 'master', 'sunshine', 'princess',
  'welcome', 'shadow', 'superman', 'michael', 'login', 'pass', 'test',
  'admin', 'iloveyou', '111111', '000000', 'baseball', 'football',
]);

const KEYBOARD_PATTERNS = [
  'qwerty', 'qwertyuiop', 'asdfgh', 'asdfghjkl', 'zxcvbn', 'zxcvbnm',
  '1234567890', 'qazwsx', 'qazwsxedc',
];

export function analyzePasswordStrength(password: string): StrengthResult {
  if (!password) {
    return {
      score: 0, level: 'very-weak', entropy: 0, crackTime: 'instant',
      suggestions: ['Enter a password'],
      hasUppercase: false, hasLowercase: false, hasNumbers: false, hasSymbols: false, length: 0,
    };
  }

  const length = password.length;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSymbols = /[^A-Za-z0-9]/.test(password);

  // Character set size for entropy calculation
  let charsetSize = 0;
  if (hasLowercase) charsetSize += 26;
  if (hasUppercase) charsetSize += 26;
  if (hasNumbers) charsetSize += 10;
  if (hasSymbols) charsetSize += 33;

  const entropy = charsetSize > 0 ? Math.log2(Math.pow(charsetSize, length)) : 0;

  let score = Math.min(100, Math.round((entropy / 128) * 100));

  const suggestions: string[] = [];

  // Length penalties & suggestions
  if (length < 8) { score -= 30; suggestions.push('Use at least 8 characters'); }
  else if (length < 12) { score -= 15; suggestions.push('Use at least 12 characters for better security'); }
  else if (length < 16) { score -= 5; }

  // Character variety
  if (!hasUppercase) { score -= 10; suggestions.push('Add uppercase letters (A-Z)'); }
  if (!hasLowercase) { score -= 10; suggestions.push('Add lowercase letters (a-z)'); }
  if (!hasNumbers) { score -= 8; suggestions.push('Add numbers (0-9)'); }
  if (!hasSymbols) { score -= 8; suggestions.push('Add symbols (!@#$%^&*)'); }

  // Common password check
  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) {
    score -= 50;
    suggestions.push('Avoid common passwords like "password" or "123456"');
  }

  // Keyboard pattern detection
  for (const pattern of KEYBOARD_PATTERNS) {
    if (lower.includes(pattern)) {
      score -= 20;
      suggestions.push('Avoid keyboard patterns like "qwerty" or "12345"');
      break;
    }
  }

  // Repeated characters
  if (/(.)\1{3,}/.test(password)) {
    score -= 15;
    suggestions.push('Avoid repeating the same character (e.g. "aaaa")');
  }

  // Sequential numbers
  if (/012|123|234|345|456|567|678|789|890/.test(password)) {
    score -= 10;
    suggestions.push('Avoid sequential numbers (e.g. "1234")');
  }

  score = Math.max(0, Math.min(100, score));

  const level: StrengthLevel =
    score >= 80 ? 'strong' :
    score >= 60 ? 'good' :
    score >= 40 ? 'fair' :
    score >= 20 ? 'weak' :
    'very-weak';

  const crackTime = estimateCrackTime(entropy);

  // Remove duplicate suggestions
  const seen = new Set<string>();
  const uniqueSuggestions = suggestions.filter((s) => seen.has(s) ? false : (seen.add(s), true)).slice(0, 3);

  return { score, level, entropy, crackTime, suggestions: uniqueSuggestions, hasUppercase, hasLowercase, hasNumbers, hasSymbols, length };
}

function estimateCrackTime(entropyBits: number): string {
  // Assume 10 billion guesses/second (high-end GPU rig)
  const guessesPerSecond = 1e10;
  const totalGuesses = Math.pow(2, entropyBits);
  const secondsTocrack = totalGuesses / guessesPerSecond / 2; // average is half

  if (secondsTocrack < 1) return 'instantly';
  if (secondsTocrack < 60) return `${Math.round(secondsTocrack)} seconds`;
  if (secondsTocrack < 3600) return `${Math.round(secondsTocrack / 60)} minutes`;
  if (secondsTocrack < 86400) return `${Math.round(secondsTocrack / 3600)} hours`;
  if (secondsTocrack < 86400 * 365) return `${Math.round(secondsTocrack / 86400)} days`;
  if (secondsTocrack < 86400 * 365 * 100) return `${Math.round(secondsTocrack / (86400 * 365))} years`;
  if (secondsTocrack < 86400 * 365 * 1_000_000) return 'centuries';
  return 'practically uncrackable';
}

export function getStrengthLabel(level: StrengthLevel): string {
  const labels: Record<StrengthLevel, string> = {
    'very-weak': 'Very Weak',
    'weak': 'Weak',
    'fair': 'Fair',
    'good': 'Good',
    'strong': 'Strong',
  };
  return labels[level];
}

export function getStrengthColor(level: StrengthLevel): string {
  const colors: Record<StrengthLevel, string> = {
    'very-weak': '#EF4444',
    'weak': '#EF4444',
    'fair': '#F59E0B',
    'good': '#3B82F6',
    'strong': '#22C55E',
  };
  return colors[level];
}
