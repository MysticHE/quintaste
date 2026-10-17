export const passwordMinimum = 15;
export const passwordMaximum = 128;
const reserved = new Set(['admin', 'administrator', 'root', 'support', 'quintaste']);

export function normalizeUsername(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}
export function validUsername(value) {
  return typeof value === 'string' && /^[a-z][a-z0-9_]{2,29}$/i.test(value) &&
    !reserved.has(value.toLowerCase());
}
export function validPassword(value) {
  return typeof value === 'string' && value.length >= passwordMinimum && value.length <= passwordMaximum;
}

