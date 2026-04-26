const { promises: dns } = require("dns");

/**
 * Errors
 */
const NON_FATAL_CODES = new Set([
  "ENODATA",
  "ENOTFOUND",
  "SERVFAIL",
  "REFUSED",
  "NOTFOUND",
  "ETIMEOUT",
  "EAI_AGAIN",
]);

/**
 * Resolve TXT records for a given host
 * @param {*} host
 * @returns
 */
async function resolveTxt(host) {
  try {
    const response = await dns.resolveTxt(host);
    return response.flat().map((record) => record.trim());
  } catch (error) {
    if (NON_FATAL_CODES.has(error.code)) {
      return [];
    }
    throw error;
  }
}

/**
 * Verify the domain token for a given domain name
 * @param {*} domainName
 * @param {*} expectedToken
 * @returns
 */
async function verifyDomainToken(domainName, expectedToken) {
  const normalizedToken = expectedToken?.trim();
  if (!normalizedToken) {
    throw new Error("Token de verificação inválido");
  }

  const challengeHost = `_weave-challenge.${domainName}`;
  const challengeRecords = await resolveTxt(challengeHost);

  const apexRecords = challengeRecords.includes(normalizedToken)
    ? []
    : await resolveTxt(domainName);

  const combined = [...challengeRecords, ...apexRecords];
  const isVerified = combined.some((record) => record === normalizedToken);

  return {
    isVerified,
    checkedHosts: [
      { host: challengeHost, records: challengeRecords },
      { host: domainName, records: apexRecords },
    ],
  };
}

module.exports = {
  verifyDomainToken,
};
