module.exports = {
  apps: [
    {
      name: "say-it-back",
      script: "server.js",
      env: {
        NODE_ENV: "production",
      },
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
    },
  ],
};
