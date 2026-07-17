// PM2 process config — dijalankan di homelab.
// cwd mengikuti lokasi clone: ~/apps/Rate-My-Staff/web-next
module.exports = {
  apps: [
    {
      name: "ratemystaff",
      script: "node_modules/next/dist/bin/next",
      // Port 3007 — dedicated agar tak bentrok app homelab lain (3000-3006 terpakai).
      args: "start -p 3007",
      cwd: __dirname,
      env: { NODE_ENV: "production", PORT: "3007" },
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "512M",
    },
  ],
};
