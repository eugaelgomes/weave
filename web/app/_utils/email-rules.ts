/**
 * Email helpers for client-side validation.
 * Do not apply Gmail dot folding or other local-part mutations — only explicit checks.
 */

/**
 * @returns true when the local part (before `@`) contains `+` (plus-addressing / subaddressing).
 */
export function emailLocalPartContainsPlus(email: string): boolean {
  const v = email.trim();
  const at = v.indexOf("@");
  if (at <= 0) {
    return false;
  }
  return v.slice(0, at).includes("+");
}
