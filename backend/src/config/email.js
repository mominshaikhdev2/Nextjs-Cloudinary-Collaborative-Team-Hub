const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendInvitationEmail = async ({ toEmail, workspaceName, inviterName, inviteUrl }) => {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: toEmail,
    subject: `${inviterName} invited you to join ${workspaceName} on Team Hub`,
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h2>You've been invited!</h2>
        <p><strong>${inviterName}</strong> has invited you to join the workspace <strong>${workspaceName}</strong> on Team Hub.</p>
        <a href="${inviteUrl}" style="display:inline-block;padding:12px 24px;background:#7C3AED;color:#fff;border-radius:6px;text-decoration:none;margin:16px 0;">
          Accept Invitation
        </a>
        <p style="color:#666;font-size:13px;">This link expires in 7 days. If you did not expect this, you can ignore this email.</p>
      </div>
    `,
  });
};

const sendMentionEmail = async ({ toEmail, mentionedBy, workspaceName, content }) => {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: toEmail,
    subject: `${mentionedBy} mentioned you in ${workspaceName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h2>You were mentioned</h2>
        <p><strong>${mentionedBy}</strong> mentioned you in <strong>${workspaceName}</strong>:</p>
        <blockquote style="border-left:4px solid #7C3AED;padding-left:16px;color:#333;">${content}</blockquote>
      </div>
    `,
  });
};

module.exports = { sendInvitationEmail, sendMentionEmail };