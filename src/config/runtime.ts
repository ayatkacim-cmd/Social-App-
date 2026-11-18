import { config } from 'dotenv';
config({ path: `.env.${process.env.NODE_ENV || 'development'}` });
export const cfg = {
 port: Number(process.env.PORT || 3000),
 db: process.env.DB_URI || 'mongodb://127.0.0.1:27017/social-app',
 accessSecret: process.env.USER_ACCESS_SECRET_KEY || '',
 refreshSecret: process.env.USER_REFRESH_SECRET_KEY || '',
 googleClientId: process.env.GOOGLE_CLIENT_ID || '',
 gmailEmail: process.env.APP_EMAIL || '',
 gmailAppPassword: (process.env.APP_PASSWORD || '').replace(/\s/g, ''),
 resendKey: process.env.RESEND_API_KEY || '',
 emailFrom: process.env.EMAIL_FROM || '',
 publicUrl: process.env.PUBLIC_URL || 'http://localhost:3000',
 dev: process.env.NODE_ENV !== 'production',
};
if (cfg.accessSecret.length < 32 || cfg.refreshSecret.length < 32 || cfg.accessSecret === cfg.refreshSecret) {
 throw new Error('Set two DIFFERENT random USER_ACCESS_SECRET_KEY and USER_REFRESH_SECRET_KEY, each >=32 chars');
}
