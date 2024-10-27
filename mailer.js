import nodemailer from 'nodemailer';

export const sendEmail = (emails, name, subject, htmlContent) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // True for 465, false for other ports
    auth: {
      user: process.env.NODE_MAILER_EMAIL, // Your email
      pass: process.env.NODE_MAILER_GMAIL_APP_PASSWORD, // Your Gmail App Password
    },
  });

  const mailOptions = {
    from: '"Raul Loyola" <raul.loy@gmail.com>', // Sender address
    to: Array.isArray(emails) ? emails.join(', ') : emails, // Receiver emails
    subject: subject, // Email subject passed as a parameter
    html: htmlContent, // HTML content passed as a parameter
  };

  // Send email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(`Error sending email: ${error}`);
    } else {
      console.log(`Email sent: ${info.response}`);
    }
  });
};
