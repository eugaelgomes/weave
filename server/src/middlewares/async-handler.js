/**
 * Wraps async route handlers so rejected promises reach Express error middleware.
 *
 * @param {import('express').RequestHandler} fn
 * @returns {import('express').RequestHandler}
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { asyncHandler };
