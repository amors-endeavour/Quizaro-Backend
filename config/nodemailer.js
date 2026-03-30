// =====================================================
// NODEMAILER CONFIGURATION
// Used for sending emails via SMTP
// =====================================================

import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();   // Loads environment variables

// =====================================================
// CREATE TRANSPORTER
// =====================================================
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,   // SMTP server host
    port: 587,                     // Port (587 for TLS)
    secure: false,                 // true only for port 465
    auth: {
        user: process.env.SMTP_USER,   // Email username
        pass: process.env.SMTP_PASS    // App password (not normal email password)
    }
});

// =====================================================
// EXPORT TRANSPORTER
// =====================================================
export { transporter };