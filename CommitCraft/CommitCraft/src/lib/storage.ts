const HISTORY_KEY = 'commitcraft_history';
const KEY_KEY = 'commitcraft_apikey';

export function getApiKey(): string {
  return localStorage.getItem(KEY_KEY) || '';
}

export function setApiKey(key: string): void {
  localStorage.setItem(KEY_KEY, key);
}

export function getHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

export function addToHistory(message: string): void {
  const history = getHistory();
  const updated = [message, ...history].slice(0, 20);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}
