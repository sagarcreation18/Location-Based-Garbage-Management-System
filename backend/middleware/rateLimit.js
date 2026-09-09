const buckets = new Map();

module.exports = function rateLimit({ windowMs = 15 * 60 * 1000, max = 600, loginMax = 20 } = {}) {
  return (req, res, next) => {
    if (!req.path.startsWith("/api/")) return next();

    const isLogin = req.path === "/api/auth/login" || req.path === "/api/auth/send-otp" || req.path === "/api/auth/verify-otp";
    const limit = isLogin ? loginMax : max;
    const scope = isLogin ? "login" : req.path.split("/").slice(1, 3).join("/");
    const key = `${req.ip}:${scope}`;
    const now = Date.now();
    const previous = buckets.get(key);
    const bucket = !previous || now > previous.reset ? { count: 0, reset: now + windowMs } : previous;

    bucket.count += 1;
    buckets.set(key, bucket);
    res.setHeader("RateLimit-Limit", limit);
    res.setHeader("RateLimit-Remaining", Math.max(0, limit - bucket.count));
    if (bucket.count > limit) return res.status(429).json({ success: false, message: "Too many requests. Please try again later." });
    next();
  };
};