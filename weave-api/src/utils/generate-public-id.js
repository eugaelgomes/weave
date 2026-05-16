const crypto = require("crypto");

/**
 * Generate a public ID with 12 characters with numbers and letters. Upper case.
 * @returns {string}
 */
function generatePublicId() {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 12; i++) {
    const randomIndex = crypto.randomInt(0, characters.length);
    result += characters[randomIndex];
  }
  return result;
}

module.exports = { generatePublicId };
