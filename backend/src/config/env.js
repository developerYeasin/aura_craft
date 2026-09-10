import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const required = (key, fallback) => {
  const value = process.env[key] ?? fallback;
  if (value === undefined) throw new Error(`Missing required env variable: ${key}`);
  return value;
};

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT || 5000),
  clientOrigin: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((o) => o.trim()),
  db: {
    host: required('DB_HOST'),
    port: Number(process.env.DB_PORT || 3306),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    name: required('DB_NAME'),
  },
  jwt: {
    secret: required('JWT_SECRET', 'dev_secret'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@auracraft.com',
    password: process.env.ADMIN_PASSWORD || 'admin123',
  },
  uploadDir: path.resolve(__dirname, '../../uploads'),
  // Platform-level COD fraud lookup: one key serves every shop on the install,
  // so it lives in env rather than in a per-shop setting.
  fraudApi: {
    url: process.env.BDCOURIER_URL || 'https://bdcourier.com/api/courier-check',
    key: process.env.FRAUD_API_KEY || '',
  },
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
    subject: process.env.VAPID_SUBJECT || 'mailto:support@auracraft.com',
  },
};
