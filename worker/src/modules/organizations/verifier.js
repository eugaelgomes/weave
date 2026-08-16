const { promises: dns } = require("dns");
const { logger } = require("@theweave/database");

const NON_FATAL_CODES = new Set([
  "EAI_AGAIN",
  "ENODATA",
  "ENOTFOUND",
  "ETIMEOUT",
  "NOTFOUND",
  "REFUSED",
  "SERVFAIL",
]);

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

  logger.debug("Domain verification result", {
    domain: domainName,
    isVerified,
  });

  return {
    checkedHosts: [
      { host: challengeHost, records: challengeRecords },
      { host: domainName, records: apexRecords },
    ],
    isVerified,
  };
}

module.exports = {
  verifyDomainToken,
};
