import nodemailer from 'nodemailer';
import { cfg } from '../../../config/runtime';


export async function sendOtp(email: string, otp: string, purpose: 'verify' | 'reset'): Promise<void> {
  const subject = purpose === 'verify' ? 'Social App - Verify your email' : 'Social App - Reset your password';
  const text = `Your Social App verification code is ${otp}. It expires in 10 minutes. Never share it.`;

  if (cfg.gmailEmail && cfg.gmailAppPassword) {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: cfg.gmailEmail,
        pass: cfg.gmailAppPassword,
      },
      tls: {
        servername: 'smtp.gmail.com',
        minVersion: 'TLSv1.2',
      },
    });
    await transporter.sendMail({
      from: `Social App <${cfg.gmailEmail}>`,
      to: email,
      subject,
      text,
      html: `<div style="font-family:Arial,sans-serif;padding:24px;max-width:500px;margin:auto"><h2>Social App</h2><p>${purpose === 'verify' ? 'Use this code to verify your email:' : 'Use this code to reset your password:'}</p><p style="font-size:32px;font-weight:bold;letter-spacing:6px">${otp}</p><p>Expires in 10 minutes. Never share this code with anyone.</p></div>`,
    });
    return;
  }

  if (cfg.resendKey && cfg.emailFrom) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: cfg.emailFrom, to: [email], subject, text }),
    });
    if (!response.ok) throw new Error(`Email provider rejected request (${response.status})`);
    return;
  }

  throw new Error('Real OTP email is not configured. Set APP_EMAIL and APP_PASSWORD in .env.development (Gmail App Password).');
}
