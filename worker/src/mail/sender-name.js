/**
 * Keep in sync with server/src/services/email/sender-name.js.
 */

/**
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
