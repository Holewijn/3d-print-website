module.exports = {
  apps: [
    {
      name: 'adminportal',
      script: 'server.js',
      cwd: '/opt/adminportal',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Log configuration
      out_file: '/var/log/adminportal/out.log',
      error_file: '/var/log/adminportal/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      // Graceful restart
      kill_timeout: 5000,
      wait_ready: false,
      listen_timeout: 10000,
    }
  ]
};
