const { Resend } = require("resend");

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM || "ARTélio <onboarding@resend.dev>";

async function sendEmail({ to, subject, html }) {
  if (!resend) {
    console.log(`[email:dev] RESEND_API_KEY not set — would send "${subject}" to ${to}:\n${html}`);
    return { simulated: true };
  }

  try {
    return await resend.emails.send({ from: FROM, to, subject, html });
  } catch (err) {
    console.error(`Failed to send email "${subject}" to ${to}:`, err.message);
    return { error: err.message };
  }
}

module.exports = { sendEmail };
