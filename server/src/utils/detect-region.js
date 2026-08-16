// services/geoService.js

const detectUserRegion = (req) => {
  const timezone = req.headers["cf-timezone"];
  const countryCode = req.headers["cf-ipcountry"];
  const realIp =
    req.headers["cf-connecting-ip"] || req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  if (!timezone) {
    return {
      countryCode: countryCode || "XX",
      ip: realIp,
      method: "fallback",
      timezone: "UTC",
    };
  }

  return {
    countryCode: countryCode,
    ip: realIp,
    method: "cloudflare",
    timezone: timezone,
  };
};

module.exports = { detectUserRegion };
