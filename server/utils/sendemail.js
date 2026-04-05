const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // 1) Create a transporter using credentials from .env
  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  // 2) Define the email options
  const mailOptions = {
    from: 'GRM Portal Admin <admin@dtu.ac.in>',
    to: options.to,
    subject: options.subject,
    html: options.html,
  };

  // 3) Send the email
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;