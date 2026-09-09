/**
 * Normalizes display name in EMAIL_FROM (e.g. "Weave Notes <x>" → "Weave <x>").
 *
 * @param {string|undefined|null} from
 * @returns {string|undefined|null}
 */
function normalizeSenderFrom(from) {
  if (!from || typeof from !== "string") {
    return from;
  }

  return from.replace(/^Weave Notes(?=\s*<|\s|$)/, "Weave");
}

module.exports = { normalizeSenderFrom };
