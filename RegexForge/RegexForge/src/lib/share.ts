export function encodeState(pattern: string, flags: string, input: string): string {
  const params = new URLSearchParams({ pattern, flags, input });
  return `${window.location.origin}?${params.toString()}`;
}

export function decodeState() {
  const params = new URLSearchParams(window.location.search);
  return {
    pattern: params.get('pattern') || '',
    flags: params.get('flags') || 'g',
    input: params.get('input') || '',
  };
}
