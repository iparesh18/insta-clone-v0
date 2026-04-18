/**
 * services/emailService.js
 *
 * Email sending service with support for multiple providers
 * Currently configured for nodemailer (SMTP)
 *
 * Environment Variables Required:
 * - SMTP_HOST: SMTP server host (e.g., smtp.gmail.com)
 * - SMTP_PORT: SMTP port (e.g., 587 for TLS, 465 for SSL)
 * - SMTP_USER: Email account username
 * - SMTP_PASS: Email account password (for Gmail: use App Password)
 * - SMTP_FROM: Email address to send from
 * - APP_URL: Frontend URL for verification links (e.g., http://localhost:5173)
 */

const nodemailer = require("nodemailer");

// Initialize transporter
let transporter;

const initializeTransporter = () => {
  if (transporter) return transporter;

  const smtpConfig = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_PORT === "465", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };

  transporter = nodemailer.createTransport(smtpConfig);

  // Verify connection
  if (process.env.NODE_ENV !== "production") {
    transporter.verify((error, success) => {
      if (error) {
        console.warn("⚠️  Email service connection failed:", error.message);
      } else {
        console.log("✓ Email service ready");
      }
    });
  }

  return transporter;
};

/**
 * Send email verification link
 * @param {string} email - User's email address
 * @param {string} username - User's username (for greeting)
 * @param {string} token - Verification token (unhashed, for URL)
 */
const sendVerificationEmail = async (email, username, token) => {
  try {
    const transporter = initializeTransporter();

    const verificationUrl = `${process.env.APP_URL || "http://localhost:5173"}/verify-email?token=${token}`;

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: "Verify Your Instagram Clone Account",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background-color: white; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #000; font-size: 28px; margin: 0; font-weight: 600;">Welcome, ${username}!</h1>
            </div>

            <!-- Main Message -->
            <div style="margin-bottom: 32px;">
              <p style="color: #666; font-size: 16px; line-height: 1.5; margin: 0 0 16px 0;">
                Thanks for signing up for Instagram Clone. To get started, please verify your email address.
              </p>
              <p style="color: #666; font-size: 16px; line-height: 1.5; margin: 0;">
                This link will expire in 24 hours.
              </p>
            </div>

            <!-- CTA Button -->
            <div style="margin-bottom: 32px; text-align: center;">
              <a href="${verificationUrl}" style="display: inline-block; background-color: #0095f6; color: white; padding: 12px 32px; border-radius: 24px; text-decoration: none; font-weight: 600; font-size: 16px;">
                Verify Email Address
              </a>
            </div>

            <!-- Alternative Link -->
            <div style="margin-bottom: 32px; padding: 16px; background-color: #f5f5f5; border-radius: 8px;">
              <p style="color: #999; font-size: 12px; margin: 0 0 8px 0;">
                Or copy and paste this link in your browser:
              </p>
              <p style="color: #0095f6; font-size: 12px; word-break: break-all; margin: 0;">
                ${verificationUrl}
              </p>
            </div>

            <!-- Footer -->
            <div style="border-top: 1px solid #e5e5e5; padding-top: 24px;">
              <p style="color: #999; font-size: 12px; margin: 0 0 8px 0;">
                If you didn't sign up for this account, please ignore this email.
              </p>
              <p style="color: #999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Instagram Clone. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      `,
      text: `
Welcome, ${username}!

Thanks for signing up for Instagram Clone. To get started, please verify your email address by visiting this link:

${verificationUrl}

This link will expire in 24 hours.

If you didn't sign up for this account, please ignore this email.

© ${new Date().getFullYear()} Instagram Clone. All rights reserved.
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✓ Verification email sent to ${email}`);
  } catch (error) {
    console.error("✗ Failed to send verification email:", error);
    throw error;
  }
};

/**
 * Send password reset email
 * @param {string} email - User's email address
 * @param {string} username - User's username (for greeting)
 * @param {string} token - Password reset token (unhashed, for URL)
 */
const sendPasswordResetEmail = async (email, username, token) => {
  try {
    const transporter = initializeTransporter();

    const resetUrl = `${process.env.APP_URL || "http://localhost:5173"}/reset-password/${token}`;

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: "Reset Your Instagram Clone Password",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background-color: white; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #000; font-size: 28px; margin: 0; font-weight: 600;">Password Reset</h1>
            </div>

            <!-- Main Message -->
            <div style="margin-bottom: 32px;">
              <p style="color: #666; font-size: 16px; line-height: 1.5; margin: 0 0 16px 0;">
                Hi ${username},
              </p>
              <p style="color: #666; font-size: 16px; line-height: 1.5; margin: 0 0 16px 0;">
                We received a request to reset your password. Click the button below to set a new password.
              </p>
              <p style="color: #666; font-size: 16px; line-height: 1.5; margin: 0;">
                This link will expire in 1 hour.
              </p>
            </div>

            <!-- CTA Button -->
            <div style="margin-bottom: 32px; text-align: center;">
              <a href="${resetUrl}" style="display: inline-block; background-color: #0095f6; color: white; padding: 12px 32px; border-radius: 24px; text-decoration: none; font-weight: 600; font-size: 16px;">
                Reset Password
              </a>
            </div>

            <!-- Footer -->
            <div style="border-top: 1px solid #e5e5e5; padding-top: 24px;">
              <p style="color: #999; font-size: 12px; margin: 0 0 8px 0;">
                If you didn't request a password reset, please ignore this email and contact support if you have concerns.
              </p>
              <p style="color: #999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Instagram Clone. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      `,
      text: `
Hi ${username},

We received a request to reset your password. Click the link below to set a new password:

${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, please ignore this email.

© ${new Date().getFullYear()} Instagram Clone. All rights reserved.
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✓ Password reset email sent to ${email}`);
  } catch (error) {
    console.error("✗ Failed to send password reset email:", error);
    throw error;
  }
};

/**
 * Send generic email (for future use)
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 * @param {string} text - Plain text content
 */
const sendEmail = async (to, subject, html, text) => {
  try {
    const transporter = initializeTransporter();

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
      text,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✓ Email sent to ${to}`);
  } catch (error) {
    console.error("✗ Failed to send email:", error);
    throw error;
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendEmail,
  initializeTransporter,
};
