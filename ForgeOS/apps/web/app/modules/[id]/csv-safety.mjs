export function sanitizeCsvCell(value) {
  const text = value == null ? '' : String(value);
  const neutralized = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
  return neutralized.replaceAll('"', '""');
}
