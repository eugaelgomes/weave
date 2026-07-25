const { verifyDomainToken } = require("./verifier");
const domainVerification = require("./domain-verification.processor");

module.exports = {
  domainVerification,
  verifyDomainToken,
};
