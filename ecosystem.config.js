module.exports = {
  apps: [{
    name: 'fitness-api',
    script: 'backend-server.ts',
    interpreter: '/root/.bun/bin/bun',
    exec_mode: 'fork',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env_file: '.env',
    env: {
      NODE_ENV: 'production',
      BACKEND_PORT: 3000,
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
