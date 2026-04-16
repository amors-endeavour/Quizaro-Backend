const { transporter } = require("./nodemailer");
const dotenv = require("dotenv");

dotenv.config();

const SENDER_EMAIL = process.env.SMTP_USER || "noreply@quizaro.com";

const sendWelcomeEmail = async (user) => {
  try {
    const mailOptions = {
      from: Object.keys(process.env).includes("SMTP_USER") ? process.env.SMTP_USER : SENDER_EMAIL,
      to: user.email,
      subject: "Welcome to Quizaro!",
      html: `
        <h2>Welcome to Quizaro, ${user.name}!</h2>
        <p>We are thrilled to have you on board. Start exploring our high-quality test series today.</p>
        <p>Happy Learning!</p>
        <p><strong>- The Quizaro Team</strong></p>
      `
    };
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending welcome email:", error);
  }
};

const sendResultEmail = async (user, testTitle, score, percentage, rank) => {
  try {
    const mailOptions = {
      from: Object.keys(process.env).includes("SMTP_USER") ? process.env.SMTP_USER : SENDER_EMAIL,
      to: user.email,
      subject: `Your Results for ${testTitle} are in!`,
      html: `
        <h2>Result Report: ${testTitle}</h2>
        <p>Here is how you performed, ${user.name}:</p>
        <ul>
          <li><strong>Score:</strong> ${score}</li>
          <li><strong>Percentage:</strong> ${percentage}%</li>
          <li><strong>Global Rank:</strong> #${rank}</li>
        </ul>
        <p>Log in to your dashboard to see a detailed breakdown and review your answers.</p>
        <br/>
        <p><strong>- The Quizaro Team</strong></p>
      `
    };
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending result email:", error);
  }
};

const sendIncompleteReminderEmail = async (user, testTitle) => {
  try {
    const mailOptions = {
      from: Object.keys(process.env).includes("SMTP_USER") ? process.env.SMTP_USER : SENDER_EMAIL,
      to: user.email,
      subject: `Don't forget to complete your test: ${testTitle}`,
      html: `
        <h2>Keep going, ${user.name}!</h2>
        <p>You have an incomplete attempt for <strong>${testTitle}</strong>.</p>
        <p>Log back in and resume your test to see how well you score!</p>
        <br/>
        <p><strong>- The Quizaro Team</strong></p>
      `
    };
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending reminder email:", error);
  }
};

module.exports = {
  sendWelcomeEmail,
  sendResultEmail,
  sendIncompleteReminderEmail
};
