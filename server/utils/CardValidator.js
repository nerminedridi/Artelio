class CardValidator {
  static validate({ cardNumber, expiry, cvv }) {
    const errors = {};
    const digitsOnly = (cardNumber || "").replace(/\s+/g, "");

    if (!/^\d{16}$/.test(digitsOnly)) {
      errors.cardNumber = "Card number must be exactly 16 digits.";
    }
    if (!/^\d{3}$/.test(cvv || "")) {
      errors.cvv = "CVV must be exactly 3 digits.";
    }

    const match = /^(\d{2})\/(\d{2})$/.exec((expiry || "").trim());
    if (!match) {
      errors.expiry = "Expiry must be in MM/YY format.";
    } else {
      const month = Number(match[1]);
      const year = 2000 + Number(match[2]);
      if (month < 1 || month > 12) {
        errors.expiry = "Expiry month must be between 01 and 12.";
      } else if (new Date(year, month, 1) <= new Date()) {
        errors.expiry = "This card has expired.";
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
      last4: digitsOnly.slice(-4),
    };
  }
}

module.exports = CardValidator;
