require('dotenv').config({ path: __dirname + '/.env' });

const required = ['DATABASE_URL', 'JWT_SECRET'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length > 0) {
  throw new Error(`[pm2] Missing required env vars in .env: ${missing.join(', ')}`);
}

module.exports = {
  apps: [{
    name: 'fitness-api',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: process.env.PORT || 3000,
      DATABASE_URL: process.env.DATABASE_URL,
      JWT_SECRET: process.env.JWT_SECRET,
      CORS_ORIGIN: process.env.CORS_ORIGIN || 'https://app.functional-wiehl.de',
      API_BASE_URL: process.env.API_BASE_URL || 'https://app.functional-wiehl.de/api',
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      SENTRY_DSN: process.env.SENTRY_DSN,
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
  }],
};
