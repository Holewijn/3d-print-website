module.exports = {
  apps: [
    {
      name: "print3d",
      cwd: "/opt/print3d",
      script: "backend/dist/server.js",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "1G",
      env: { NODE_ENV: "production" },
      error_file: "/var/log/print3d/error.log",
      out_file: "/var/log/print3d/out.log",
      merge_logs: true,
      time: true
    }
  ]
};
