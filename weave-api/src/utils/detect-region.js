// services/geoService.js

const detectUserRegion = (req) => {
  const timezone = req.headers["cf-timezone"];
  const countryCode = req.headers["cf-ipcountry"];
  const realIp =
    req.headers["cf-connecting-ip"] ||
    req.headers["x-forwarded-for"] ||
    req.socket.remoteAddress;

  if (!timezone) {
    return {
      timezone: "UTC",
      countryCode: countryCode || "XX",
      ip: realIp,
      method: "fallback",
    };
  }

  return {
    timezone: timezone,
    countryCode: countryCode,
    ip: realIp,
    method: "cloudflare",
  };
};

module.exports = { detectUserRegion };
