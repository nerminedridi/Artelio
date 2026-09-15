const WRAPPER_STYLE =
  "font-family: Georgia, serif; background-color: #E8EEF8; padding: 40px 20px;";
const CARD_STYLE =
  "max-width: 480px; margin: 0 auto; background: #FFFFFF; border-radius: 14px; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);";
const LOGO_STYLE = "font-size: 28px; font-weight: 800; color: #2E3A5F; margin: 0 0 24px;";
const BUTTON_STYLE =
  "display: inline-block; background: #2E3A5F; color: #FFFFFF; text-decoration: none; padding: 12px 28px; border-radius: 30px; font-weight: 600; margin: 16px 0;";
const FOOTER_STYLE = "font-size: 12px; color: #8A93A8; margin-top: 24px;";

function wrap(bodyHtml) {
  return `
    <div style="${WRAPPER_STYLE}">
      <div style="${CARD_STYLE}">
        <p style="${LOGO_STYLE}">ARTélio</p>
        ${bodyHtml}
        <p style="${FOOTER_STYLE}">You're receiving this because of activity on your ARTélio account.</p>
      </div>
    </div>
  `;
}

function welcomeEmail(username) {
  return wrap(`
    <p>Hi ${username},</p>
    <p>Welcome to ARTélio — a gallery where discovery is curated by people, not algorithms. Your account is ready to go.</p>
    <p>Browse showrooms, follow artists and curators, and start building your own collection.</p>
  `);
}

function passwordResetEmail(username, resetUrl) {
  return wrap(`
    <p>Hi ${username},</p>
    <p>We received a request to reset your ARTélio password. This link expires in 1 hour.</p>
    <p><a href="${resetUrl}" style="${BUTTON_STYLE}">Reset your password</a></p>
    <p>If you didn't request this, you can safely ignore this email — your password won't change.</p>
  `);
}

function newsletterConfirmationEmail(email) {
  return wrap(`
    <p>You're subscribed!</p>
    <p>${email} will now hear from ARTélio about new showrooms, featured artists, and curated collections.</p>
  `);
}

module.exports = { welcomeEmail, passwordResetEmail, newsletterConfirmationEmail };
