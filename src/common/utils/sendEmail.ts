import { createTransport } from 'nodemailer';

const sendEmail = async (mailOptions: {
  from: string;
  to: string;
  subject: string;
  html: string;
}) => {
  try {
    const transporter = createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER_NAME,
        pass: process.env.SMTP_USER_PASSWORD,
      },
    });

    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error(err);
  }
};

export default sendEmail;
