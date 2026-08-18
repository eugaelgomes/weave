const crypto = require("crypto");

/**
 * Generate a public ID with 12 characters with numbers and letters. Upper case.
 * @returns {string}
 */
function generatePublicId(size = 12) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < size; i++) {
    result += characters[crypto.randomInt(0, characters.length)];
  }
  return result;
}

/**
 * Email rules for API validation.
 * - Never strip or "normalize away" dots in Gmail local parts (no dot folding).
 * - Reject plus-addressing / subaddressing: `+` in the local part (e.g. user+tag@domain).
 *
 * @param {string} email
 * @returns {boolean} true if local part contains `+`
 */
function hasPlusAliasInLocalPart(email) {
  const v = String(email || "").trim();
  const at = v.indexOf("@");
  if (at <= 0) {
    return false;
  }
  return v.slice(0, at).includes("+");
}

module.exports = {
  generatePublicId,
  hasPlusAliasInLocalPart,
};
