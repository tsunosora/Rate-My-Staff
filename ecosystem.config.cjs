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
    {
      // Scheduler tarik absensi otomatis (tiap 15 menit) — memanggil endpoint
      // cron app. Bisa dimatikan tanpa stop proses: matikan toggle "Tarik
      // otomatis" di Pengaturan (setting fp_device_auto).
      name: "ratemystaff-poller",
      script: "scripts/poll-attendance.mjs",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        POLL_URL: "http://127.0.0.1:3007/api/fingerspot/cron-pull",
        POLL_INTERVAL_MS: "900000",
        // CRON_SECRET diambil dari environment (samakan dengan app; mis. lewat .env / PM2 env).
      },
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "128M",
    },
  ],
};
