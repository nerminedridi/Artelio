
function memoizeAsync(fn, ttlMs) {
  let cached = null;
  let expiresAt = 0;

  return async function () {
    const now = Date.now();
    if (cached && now < expiresAt) return cached;
    cached = await fn();
    expiresAt = now + ttlMs;
    return cached;
  };
}

module.exports = { memoizeAsync };
