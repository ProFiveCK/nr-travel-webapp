import 'dotenv/config';

const required = (value: string | undefined, key: string) => {
  if (!value) {
    throw new Error(`Missing required env var ${key}`);
  }
  return value;
};

export const config = {
  port: Number(process.env.API_PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  jwtSecret: required(process.env.JWT_SECRET, 'JWT_SECRET'),
  refreshSecret: required(process.env.REFRESH_SECRET, 'REFRESH_SECRET'),
  clientUrl: process.env.CLIENT_URL ?? 'https://travel.naurufinance.info',
  uploadsDir: process.env.UPLOADS_DIR ?? '/app/uploads',
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: Number(process.env.SMTP_PORT ?? 587),
    username: process.env.SMTP_USERNAME ?? '',
    password: process.env.SMTP_PASSWORD ?? '',
    from: process.env.SMTP_FROM ?? 'Travel Desk <no-reply@example.com>',
  },
};
