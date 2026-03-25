const nodemailer = require('nodemailer');
require('dotenv').config();

// Create reusable transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
    },
});

/**
 * Send OTP email for password reset
 */
async function sendOTPEmail(to, otp, userName) {
    const fromName = process.env.SMTP_FROM_NAME || 'DentalCamp';
    const mailOptions = {
        from: `"${fromName}" <${process.env.SMTP_EMAIL}>`,
        to,
        subject: `${otp} is your DentalCamp verification code`,
        html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0f172a; border-radius: 16px; overflow: hidden;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #0d9488, #f97316); padding: 32px 24px; text-align: center;">
                <div style="font-size: 40px; margin-bottom: 8px;">🦷</div>
                <h1 style="color: #fff; margin: 0; font-size: 22px; font-weight: 700;">DentalCamp</h1>
                <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0; font-size: 13px;">Password Reset Verification</p>
            </div>

            <!-- Body -->
            <div style="padding: 32px 24px;">
                <p style="color: #cbd5e1; font-size: 15px; margin: 0 0 20px;">
                    Hi <strong style="color: #f1f5f9;">${userName || 'there'}</strong>,
                </p>
                <p style="color: #94a3b8; font-size: 14px; margin: 0 0 24px; line-height: 1.5;">
                    We received a request to reset your password. Use the verification code below to proceed:
                </p>

                <!-- OTP Box -->
                <div style="background: #1e293b; border: 2px solid #0d9488; border-radius: 12px; padding: 20px; text-align: center; margin: 0 0 24px;">
                    <div style="font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #14b8a6; font-family: 'Courier New', monospace;">
                        ${otp}
                    </div>
                    <p style="color: #64748b; font-size: 12px; margin: 8px 0 0;">
                        This code expires in <strong style="color: #f97316;">10 minutes</strong>
                    </p>
                </div>

                <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0;">
                    If you didn't request this, you can safely ignore this email. Your password will remain unchanged.
                </p>
            </div>

            <!-- Footer -->
            <div style="padding: 16px 24px; border-top: 1px solid #1e293b; text-align: center;">
                <p style="color: #475569; font-size: 11px; margin: 0;">
                    © ${new Date().getFullYear()} DentalCamp · Digital Dental Camp Management
                </p>
            </div>
        </div>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`📧 OTP email sent to ${to}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Email send failed:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Verify SMTP connection (call on startup)
 */
async function verifyEmailConfig() {
    if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
        console.log('⚠️  SMTP not configured — email features disabled');
        return false;
    }
    try {
        await transporter.verify();
        console.log('📧 SMTP connection verified');
        return true;
    } catch (error) {
        console.error('❌ SMTP verification failed:', error.message);
        return false;
    }
}

module.exports = { sendOTPEmail, verifyEmailConfig };
