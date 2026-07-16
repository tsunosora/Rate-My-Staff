// PM2 process config — dijalankan di homelab.
// cwd mengikuti lokasi clone: ~/apps/Rate-My-Staff/web-next
module.exports = {
  apps: [
    {
      name: "ratemystaff",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: __dirname,
      env: { NODE_ENV: "production", PORT: "3000" },
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "512M",
    },
  ],
};
