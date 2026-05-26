const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, html, attachments = [] }, smtpConfig = null) => {
  let transportConfig;

  if (smtpConfig && smtpConfig.smtpHost) {
    transportConfig = {
      host: smtpConfig.smtpHost,
      port: smtpConfig.smtpPort || 587,
      secure: (smtpConfig.smtpPort || 587) === 465,
      auth: {
        user: smtpConfig.smtpUser,
        pass: smtpConfig.smtpPass,
      },
    };
  } else {
    // Fall back to env config
    transportConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    };
  }

  const transporter = nodemailer.createTransport(transportConfig);

  const mailOptions = {
    from: smtpConfig?.smtpUser || process.env.SMTP_USER || 'noreply@harrsh-hr.com',
    to,
    subject,
    html,
    attachments,
  };

  await transporter.sendMail(mailOptions);
};

// Email templates
const leaveAppliedTemplate = (employeeName, leaveType, startDate, endDate, days) => `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px;">
    <h2 style="color: #4F46E5;">New Leave Request</h2>
    <p>A leave request has been submitted and requires your approval.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Employee</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${employeeName}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Leave Type</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${leaveType}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">From</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${startDate}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">To</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${endDate}</td></tr>
      <tr><td style="padding: 8px; color: #666;">Total Days</td><td style="padding: 8px; font-weight: bold;">${days} day(s)</td></tr>
    </table>
    <p style="color: #888; font-size: 12px;">Please log in to the HR portal to take action.</p>
  </div>
</body>
</html>
`;

const leaveActionedTemplate = (employeeName, leaveType, action, comment) => `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px;">
    <h2 style="color: ${action === 'APPROVED' ? '#10B981' : '#EF4444'};">Leave Request ${action === 'APPROVED' ? 'Approved' : 'Rejected'}</h2>
    <p>Dear ${employeeName},</p>
    <p>Your <strong>${leaveType}</strong> leave request has been <strong>${action.toLowerCase()}</strong>.</p>
    ${comment ? `<div style="background: #f9f9f9; padding: 12px; border-radius: 4px; margin: 16px 0;"><p style="margin: 0; color: #555;"><strong>Comment:</strong> ${comment}</p></div>` : ''}
    <p style="color: #888; font-size: 12px;">Please log in to the HR portal for more details.</p>
  </div>
</body>
</html>
`;

const payslipReadyTemplate = (employeeName, month, year) => `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px;">
    <h2 style="color: #4F46E5;">Your Payslip is Ready</h2>
    <p>Dear ${employeeName},</p>
    <p>Your payslip for <strong>${month} ${year}</strong> has been generated and is attached to this email.</p>
    <p>You can also download it directly from the HR portal under the Payroll section.</p>
    <p style="color: #888; font-size: 12px;">This is an automated email. Please do not reply.</p>
  </div>
</body>
</html>
`;

const welcomeTemplate = (employeeName, orgName, email, tempPassword) => `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px;">
    <h2 style="color: #4F46E5;">Welcome to ${orgName}!</h2>
    <p>Dear ${employeeName},</p>
    <p>Your HR portal account has been created. Here are your login credentials:</p>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Email</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${email}</td></tr>
      <tr><td style="padding: 8px; color: #666;">Password</td><td style="padding: 8px; font-weight: bold;">${tempPassword}</td></tr>
    </table>
    <p style="color: #EF4444; font-size: 13px;">Please change your password after first login.</p>
  </div>
</body>
</html>
`;

module.exports = { sendEmail, leaveAppliedTemplate, leaveActionedTemplate, payslipReadyTemplate, welcomeTemplate };
