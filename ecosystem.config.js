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
      PORT: 3000,
      DATABASE_URL: 'postgresql://app_user:LKW_Peter123!@localhost:5432/fitness_app',
      JWT_SECRET: 'aN8hS3kZrPq!xY9mWt7sKuF2LgJeD4b',
      CORS_ORIGIN: 'https://app.functional-wiehl.de',
      API_BASE_URL: 'https://app.functional-wiehl.de/api'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};