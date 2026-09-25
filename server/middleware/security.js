const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const isProduction = process.env.NODE_ENV === "production";

// Pages use inline <script> blocks, so 'unsafe-inline' is required for scripts and styles.
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      connectSrc: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: isProduction ? [] : null,
    },
  },
});

function limiter({ windowMinutes, max, message }) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit: max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: message },
    skip: () => process.env.NODE_ENV === "test" && !process.env.RATE_LIMIT_IN_TEST,
  });
}

const loginLimiter = limiter({
  windowMinutes: 15,
  max: 10,
  message: "Too many login attempts. Try again in a few minutes.",
});

const registerLimiter = limiter({
  windowMinutes: 60,
  max: 10,
  message: "Too many sign-ups from this address. Try again later.",
});

const passwordResetLimiter = limiter({
  windowMinutes: 60,
  max: 5,
  message: "Too many password reset requests. Try again later.",
});

const newsletterLimiter = limiter({
  windowMinutes: 60,
  max: 10,
  message: "Too many subscription attempts. Try again later.",
});

module.exports = { securityHeaders, loginLimiter, registerLimiter, passwordResetLimiter, newsletterLimiter };
