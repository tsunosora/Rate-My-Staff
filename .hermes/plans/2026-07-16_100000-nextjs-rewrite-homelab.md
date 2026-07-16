# Rate-My-Staff — Rewrite Penuh ke Next.js + Deploy Homelab

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Merombak total aplikasi Rate-My-Staff dari **Laravel 11 + Vue 3** menjadi **Next.js full-stack (App Router)** + **Prisma + MySQL**, dengan **Auth.js (credentials)**, di-deploy di **homelab pakai PM2** di balik **Cloudflare Tunnel** (subdomain `volikoprint.com`), dan menyediakan pondasi **"cloud mesin absensi" Fingerspot** (endpoint receiver push).

**Architecture:** Satu aplikasi Next.js (App Router) yang menyatukan UI (React Server/Client Components + Tailwind) dan backend (Route Handlers `app/api/**` + Server Actions). Data lewat Prisma ke MySQL. Auth pakai Auth.js Credentials provider + Prisma adapter, RBAC via kolom `user.role` + middleware. Logika bisnis berat (perhitungan attendance/overtime/report aggregation) di-porting ke modul TypeScript murni di `lib/` supaya bisa di-unit-test tanpa HTTP. DB fresh — skema Prisma baru + seed minimal (admin + master data), TIDAK migrasi data lama.

**Tech Stack:** Next.js 15 (App Router, TypeScript), React 19, Tailwind CSS 4, Prisma 6 + MySQL 8, Auth.js v5 (`next-auth@beta`) + `@auth/prisma-adapter`, `bcryptjs`, `zod` (validasi), `react-chartjs-2` + `chart.js`, `qrcode.react`, `@react-pdf/renderer` (PDF) + `exceljs` (Excel), `vitest` (unit) + `@playwright/test` (e2e opsional), PM2, Cloudflare Tunnel.

**Prinsip:** DRY, YAGNI, TDD, commit sering. Logika bisnis non-trivial diuji unit dulu (RED→GREEN) sebelum dibungkus route.

---

## ⚠️ Konteks & Keputusan Terkunci (BACA DULU)

Keputusan user (sesi 2026-07-16) yang mengikat seluruh plan:

1. **Buang total Laravel.** Rewrite penuh Next.js full-stack. Tidak ada PHP di runtime akhir. Repo Laravel lama tetap ada sebagai **referensi logika** selama implementasi (jangan dihapus sampai paritas fitur tercapai).
2. **Prisma + MySQL.** Database tetap MySQL, akses via Prisma.
3. **DB fresh.** Skema baru via `prisma migrate`, seed minimal (1 admin + master data contoh). Riwayat lama TIDAK dibawa.
4. **Auth.js + Prisma adapter**, Credentials (email+password bcrypt), role di kolom `user.role`, guard via `middleware.ts`.
5. **Deploy PM2** di homelab (Ubuntu 24.04, `ssh homelab`), publik via **Cloudflare Tunnel** ke subdomain `volikoprint.com` (routing diatur di dashboard Cloudflare Zero Trust — lihat memory `reference-attendance-machine-and-infra`).
6. **Cloud mesin absensi:** plan ini HANYA membangun **pondasi receiver push** (endpoint HTTP + tabel raw log + mapper). **Blocker aktif:** format protokol mesin Fingerspot belum diketahui (HTTP vs proprietary TCP:8014) — lihat memory `project-fingerspot-push-integration`. Endpoint receiver dibangun berdasarkan asumsi HTTP; jika ternyata proprietary TCP, butuh langkah terpisah (VPS listener) DI LUAR plan ini. **Jangan blokir rewrite web karena blocker ini.**

### Paritas fitur yang harus dicapai (dari audit repo lama)
- **Auth:** login/logout, session, RBAC.
- **Employees:** CRUD, auto-generate `employee_code`, foto, QR public token, import CSV, export PDF, attendance-summary per employee.
- **Assessments:** template + indicator CRUD (bobot 100%), single & bulk scoring (skala 1–5 berbobot), edit, grade otomatis, draft/completed, notifikasi saat completed.
- **Attendance:** index harian, manual entry, import Excel/CSV/HTML 2-tahap (preview+finalize), report agregasi kompleks (`getReportData`), edit record, metrics dashboard.
- **Overtime:** kategori CRUD, **strategy pattern** 2 engine (Standard vs RateMyStaff-custom), slip lembur.
- **Work schedules:** CRUD, jam kerja/istirahat, upah, toleransi telat, penanda hari libur.
- **Reports:** agregasi assessment, filter, export PDF/Excel, employee report, public feedbacks.
- **Public forms (token, tanpa login):** rate employee (QR, 1–5), absence form (Izin/Sakit/Cuti, link 24 jam kadaluarsa), halaman link expired.
- **Dashboard:** KPI cards, chart tren performa & attendance, alert dinamis, recent activity (audit log).
- **Settings:** branding/subdomain, master data (dept/posisi), holidays, konteks engine overtime, kredensial Fingerspot, notifikasi.
- **Notifications:** database channel, index, mark-read.
- **Audit log:** aksi user tercatat.

---

## Struktur direktori target

Rewrite ditaruh di **direktori/repo baru** agar bersih (tidak menimpa Laravel selama porting). Rekomendasi: subfolder `web-next/` di dalam repo yang sama, atau repo terpisah `rate-my-staff-next`. Plan ini asumsikan `web-next/` relatif ke root repo.

```
web-next/
  app/
    (auth)/login/page.tsx
    (dashboard)/                # grup terproteksi (pakai AppLayout)
      layout.tsx               # sidebar + header
      dashboard/page.tsx
      employees/page.tsx
      assessments/{single,bulk,templates}/...
      attendance/{page.tsx,report/page.tsx}
      reports/page.tsx
      settings/{page.tsx,work-schedules/page.tsx}
    (public)/                   # tanpa sidebar, tanpa auth
      rate/[token]/page.tsx
      absence/[token]/page.tsx
      link-expired/page.tsx
    api/
      auth/[...nextauth]/route.ts
      employees/route.ts  employees/[id]/route.ts  ...
      attendance/...
      fingerspot/webhook/route.ts
      public/...
  lib/
    prisma.ts
    auth.ts                    # Auth.js config
    rbac.ts                    # helper cek role
    validators/*.ts            # zod schemas
    services/
      grade.ts                 # perhitungan grade & total score
      attendance/report.ts     # port getReportData()
      attendance/import.ts     # parser 2-tahap
      overtime/                # strategy pattern
        index.ts factory.ts standard.ts rate-my-staff.ts types.ts
      fingerspot/mapper.ts     # normalisasi scanlog -> attendance
      export/{pdf,excel}.ts
    audit.ts
  components/                  # UI (tabel, modal, chart, form)
  prisma/
    schema.prisma
    seed.ts
  middleware.ts
  ecosystem.config.cjs         # PM2
  tests/                       # vitest unit
  .env / .env.example
  package.json tsconfig.json next.config.ts tailwind.config.ts
```

---

# FASE 1 — Scaffold Proyek Next.js

### Task 1.1: Inisialisasi Next.js + TypeScript + Tailwind

**Objective:** Buat proyek Next.js kosong yang jalan di `web-next/`.

**Files:** Create: `web-next/` (seluruh scaffold)

**Step 1:** Dari root repo jalankan:
```bash
npx create-next-app@latest web-next \
  --ts --app --tailwind --eslint --src-dir=false \
  --import-alias "@/*" --no-turbopack
```

**Step 2:** Verifikasi dev server:
```bash
cd web-next && npm run dev
```
Expected: server jalan di `http://localhost:3000`, halaman default tampil.

**Step 3:** Commit.
```bash
git add web-next && git commit -m "chore: scaffold next.js app (web-next)"
```

### Task 1.2: Pasang dependensi inti

**Objective:** Install semua lib runtime & dev yang dipakai plan.

**Step 1:** Install:
```bash
cd web-next
npm i prisma @prisma/client next-auth@beta @auth/prisma-adapter bcryptjs zod \
  chart.js react-chartjs-2 qrcode.react exceljs @react-pdf/renderer date-fns
npm i -D @types/bcryptjs vitest @vitejs/plugin-react vite-tsconfig-paths \
  @testing-library/react @testing-library/jest-dom jsdom
```

**Step 2:** Tambah script test di `web-next/package.json`:
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start -p 3000",
  "test": "vitest run",
  "test:watch": "vitest",
  "db:migrate": "prisma migrate dev",
  "db:seed": "tsx prisma/seed.ts",
  "db:studio": "prisma studio"
}
```

**Step 3:** Buat `web-next/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: { environment: "jsdom", globals: true, setupFiles: [] },
});
```

**Step 4:** Verifikasi `npm run test` jalan (0 test dulu, exit 0). Commit:
```bash
git add web-next && git commit -m "chore: add core deps + vitest config"
```

### Task 1.3: `.env.example` & konfigurasi env

**Objective:** Definisikan variabel env yang dibutuhkan.

**Files:** Create: `web-next/.env.example`, `web-next/.env`

```dotenv
# Database
DATABASE_URL="mysql://ratemystaff:CHANGE_ME@127.0.0.1:3306/ratemystaff"

# Auth.js
AUTH_SECRET="GENERATE_WITH: npx auth secret"
AUTH_TRUST_HOST=true
NEXTAUTH_URL="https://app.volikoprint.com"

# App
APP_URL="https://app.volikoprint.com"

# Fingerspot receiver (opsional, diisi saat integrasi mesin)
FINGERSPOT_WEBHOOK_SECRET=""
```

**Step:** Commit `.env.example` (jangan commit `.env` — pastikan ada di `.gitignore`).

---

# FASE 2 — Database: Prisma Schema + MySQL + Seed

> Skema di bawah adalah bentuk FINAL hasil audit 31 migrasi Laravel (sudah digabung, termasuk kolom `add_*`). Enum & JSON dipetakan ke tipe Prisma. Soft-delete direpresentasikan kolom `deletedAt DateTime?` (query harus filter manual atau pakai Prisma extension).

### Task 2.1: Siapkan MySQL lokal untuk dev

**Objective:** DB kosong siap dipakai Prisma.

**Step 1:** Buat DB & user (dev lokal):
```bash
mysql -u root -p -e "CREATE DATABASE ratemystaff CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; \
CREATE USER 'ratemystaff'@'localhost' IDENTIFIED BY 'CHANGE_ME'; \
GRANT ALL ON ratemystaff.* TO 'ratemystaff'@'localhost'; FLUSH PRIVILEGES;"
```
**Step 2:** Set `DATABASE_URL` di `web-next/.env`. Verifikasi `npx prisma db pull` bisa konek (akan bilang schema kosong — OK).

### Task 2.2: Tulis `prisma/schema.prisma`

**Objective:** Definisikan seluruh model.

**Files:** Create: `web-next/prisma/schema.prisma`

```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "mysql"; url = env("DATABASE_URL") }

enum Role { ADMIN HR EVALUATOR OWNER }
enum AssessmentStatus { draft completed approved }
enum OvertimeType { flat hourly hybrid }

model User {
  id            Int       @id @default(autoincrement())
  name          String
  email         String    @unique
  emailVerified DateTime?
  password      String
  role          Role      @default(EVALUATOR)
  rememberToken String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  assessments   Assessment[] @relation("Evaluator")
  auditLogs     AuditLog[]
  notifications Notification[]
}

model Department {
  id        Int       @id @default(autoincrement())
  name      String    @unique
  positions Position[]
  employees Employee[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Position {
  id           Int         @id @default(autoincrement())
  name         String
  departmentId Int?
  department   Department? @relation(fields: [departmentId], references: [id], onDelete: SetNull)
  employees    Employee[]
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  @@index([departmentId])
}

model WorkSchedule {
  id                   Int      @id @default(autoincrement())
  name                 String
  startTime            String?  // "HH:mm"
  endTime              String?
  breakStartTime       String?
  breakEndTime         String?
  lateToleranceMinutes Int      @default(15)
  dailyWage            Decimal  @default(0) @db.Decimal(15,2)
  weeklyWage           Decimal  @default(0) @db.Decimal(15,2)
  monthlyWage          Decimal  @default(0) @db.Decimal(15,2)
  holidayWage          Decimal  @default(0) @db.Decimal(15,2)
  overtimeWagePerHour  Decimal  @default(0) @db.Decimal(15,2)
  isHoliday            Boolean  @default(false)
  employees            Employee[]
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  deletedAt            DateTime?
}

model Employee {
  id             Int       @id @default(autoincrement())
  employeeCode   String    @unique @db.VarChar(20)
  publicToken    String?   @unique @db.VarChar(36)
  fullName       String    @db.VarChar(150)
  nickname       String?   @db.VarChar(50)
  departmentId   Int?
  positionId     Int?
  workScheduleId Int?
  photoPath      String?   @db.VarChar(255)
  joinDate       DateTime?
  salary         Decimal?  @db.Decimal(15,2)
  email          String?
  phone          String?
  isActive       Boolean   @default(true)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  deletedAt      DateTime?
  department     Department?   @relation(fields: [departmentId], references: [id], onDelete: SetNull)
  position       Position?     @relation(fields: [positionId], references: [id], onDelete: SetNull)
  workSchedule   WorkSchedule? @relation(fields: [workScheduleId], references: [id], onDelete: SetNull)
  assessments    Assessment[]
  attendances    Attendance[]
  @@index([employeeCode]) @@index([isActive])
}

model AssessmentTemplate {
  id             Int      @id @default(autoincrement())
  name           String   @db.VarChar(100)
  description    String?  @db.Text
  departmentType String?  @db.VarChar(50)
  isActive       Boolean  @default(true)
  indicators     AssessmentIndicator[]
  assessments    Assessment[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  @@index([isActive])
}

model AssessmentIndicator {
  id          Int      @id @default(autoincrement())
  templateId  Int
  category    String   @db.VarChar(100)
  name        String   @db.VarChar(150)
  description String?  @db.Text
  weight      Decimal  @db.Decimal(5,2)
  sortOrder   Int      @default(0)
  template    AssessmentTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  scores      AssessmentScore[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@index([templateId])
}

model Assessment {
  id             Int      @id @default(autoincrement())
  employeeId     Int
  templateId     Int
  evaluatorId    Int?
  isPublic       Boolean  @default(false)
  assessmentDate DateTime
  period         String?
  totalScore     Decimal? @db.Decimal(5,2)
  grade          String?  @db.VarChar(20)
  raterName      String?
  evaluatorNotes String?  @db.Text
  developmentPlan String? @db.Text
  recommendation String?  @db.Text
  status         AssessmentStatus @default(draft)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?
  employee       Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  template       AssessmentTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  evaluator      User?    @relation("Evaluator", fields: [evaluatorId], references: [id], onDelete: Cascade)
  scores         AssessmentScore[]
  @@index([employeeId]) @@index([templateId]) @@index([evaluatorId])
  @@index([assessmentDate]) @@index([status])
}

model AssessmentScore {
  id            Int      @id @default(autoincrement())
  assessmentId  Int
  indicatorId   Int
  score         Int
  weightedValue Decimal  @db.Decimal(5,2)
  notes         String?  @db.Text
  assessment    Assessment @relation(fields: [assessmentId], references: [id], onDelete: Cascade)
  indicator     AssessmentIndicator @relation(fields: [indicatorId], references: [id], onDelete: Cascade)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  @@index([assessmentId]) @@index([indicatorId])
}

model OvertimeCategory {
  id             Int      @id @default(autoincrement())
  name           String
  type           OvertimeType @default(hourly)
  rate           Decimal  @default(0) @db.Decimal(10,2)
  companyContext String   @default("default")
  attendances    Attendance[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model Attendance {
  id                       Int      @id @default(autoincrement())
  employeeId               Int
  scanDate                 DateTime
  scanType                 String?  @db.VarChar(20)   // in | out | absence
  machineName              String?  @db.VarChar(100)
  snMachine                String?  @db.VarChar(100)
  status                   String   @default("on_time") @db.VarChar(20)
  absenceReason            String?  @db.Text
  lateMinutes              Int      @default(0)
  overtimeMinutes          Int      @default(0)
  overtimeReason           String?  @db.Text
  overtimeCategoryId       Int?
  approvedOvertimeMinutes  Int      @default(0)
  overtimeAmount           Decimal  @default(0) @db.Decimal(12,2)
  employee                 Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  overtimeCategory         OvertimeCategory? @relation(fields: [overtimeCategoryId], references: [id], onDelete: SetNull)
  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt
  @@index([employeeId]) @@index([scanDate]) @@index([status])
}

model Holiday {
  id        Int      @id @default(autoincrement())
  date      DateTime @unique
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model LeaveLink {
  id        Int      @id @default(autoincrement())
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Setting {
  id        Int      @id @default(autoincrement())
  key       String   @unique
  value     String?  @db.Text
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model AuditLog {
  id          Int      @id @default(autoincrement())
  userId      Int
  action      String   @db.VarChar(50)
  targetTable String   @db.VarChar(50)
  targetId    Int?
  oldValues   Json?
  newValues   Json?
  ipAddress   String?  @db.VarChar(45)
  userAgent   String?  @db.Text
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  @@index([userId]) @@index([action]) @@index([targetTable]) @@index([createdAt])
}

model Notification {
  id        String   @id @default(uuid())
  userId    Int
  type      String
  data      Json
  readAt    DateTime?
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([userId]) @@index([readAt])
}

// Tabel raw untuk pondasi cloud mesin absensi (push receiver)
model FingerspotRawLog {
  id          Int      @id @default(autoincrement())
  snMachine   String?  @db.VarChar(100)
  pin         String?  @db.VarChar(50)
  scanAt      DateTime?
  rawBody     Json
  processed   Boolean  @default(false)
  createdAt   DateTime @default(now())
  @@index([processed]) @@index([snMachine])
}
```

**Catatan porting penting:**
- **Notifications polymorphic** Laravel → disederhanakan jadi `userId` langsung (YAGNI: hanya User yang di-notify). Kolom `data` = Json.
- **Spatie roles/permissions** → disederhanakan jadi enum `Role` di `User` (per keputusan Auth.js RBAC by column). Tidak porting tabel permission granular kecuali dibutuhkan nanti.
- **Soft delete** (`deletedAt`) di Employee/Assessment/WorkSchedule: buat helper query yang selalu `where: { deletedAt: null }` (lihat Task 5.x).

**Step:** `npx prisma format` untuk validasi sintaks. Commit.

### Task 2.3: Migrasi awal

```bash
cd web-next && npx prisma migrate dev --name init
```
Expected: folder `prisma/migrations/*_init` dibuat, tabel muncul di MySQL. Verifikasi `npx prisma studio`.
Commit migration.

### Task 2.4: Prisma client singleton

**Files:** Create: `web-next/lib/prisma.ts`
```ts
import { PrismaClient } from "@prisma/client";
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```
Commit.

### Task 2.5: Seed minimal

**Files:** Create: `web-next/prisma/seed.ts`

**Objective:** 1 admin + master data contoh + 1 template default + kategori overtime default + work schedule default.
```ts
import { PrismaClient, Role, OvertimeType } from "@prisma/client";
import bcrypt from "bcryptjs";
const db = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("admin123", 10);
  await db.user.upsert({
    where: { email: "admin@ratemystaff.local" },
    update: {},
    create: { name: "Admin", email: "admin@ratemystaff.local", password, role: Role.ADMIN },
  });
  const dept = await db.department.upsert({
    where: { name: "Produksi" }, update: {}, create: { name: "Produksi" },
  });
  await db.position.create({ data: { name: "Operator", departmentId: dept.id } });
  await db.workSchedule.create({
    data: { name: "Shift Pagi", startTime: "08:00", endTime: "17:00", lateToleranceMinutes: 15 },
  });
  await db.overtimeCategory.createMany({
    data: [
      { name: "Lembur Cetak", type: OvertimeType.hourly, rate: 15000, companyContext: "rate_my_staff_custom" },
      { name: "Lembur Libur", type: OvertimeType.flat, rate: 100000, companyContext: "rate_my_staff_custom" },
    ],
  });
  await db.setting.createMany({
    data: [
      { key: "overtime_engine_context", value: "default" },
      { key: "auto_sunday_holiday", value: "true" },
    ],
    skipDuplicates: true,
  });
}
main().finally(() => db.$disconnect());
```
**Step:** `npm i -D tsx` lalu `npm run db:seed`. Verifikasi user admin ada di Studio. Commit.

---

# FASE 3 — Auth.js (Credentials + RBAC)

### Task 3.1: Konfig Auth.js

**Files:** Create: `web-next/lib/auth.ts`
```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        const user = await prisma.user.findUnique({ where: { email: String(creds?.email) } });
        if (!user) return null;
        const ok = await bcrypt.compare(String(creds?.password), user.password);
        if (!ok) return null;
        return { id: String(user.id), name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) { if (user) token.role = (user as any).role; return token; },
    session({ session, token }) { (session.user as any).role = token.role; return session; },
  },
});
```

**Files:** Create: `web-next/app/api/auth/[...nextauth]/route.ts`
```ts
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```
Commit.

### Task 3.2: Middleware guard

**Files:** Create: `web-next/middleware.ts`
```ts
import { auth } from "@/lib/auth";
export default auth((req) => {
  const isPublic = ["/login", "/rate", "/absence", "/link-expired"]
    .some((p) => req.nextUrl.pathname.startsWith(p))
    || req.nextUrl.pathname.startsWith("/api/public")
    || req.nextUrl.pathname.startsWith("/api/fingerspot")
    || req.nextUrl.pathname.startsWith("/api/auth");
  if (!isPublic && !req.auth) {
    return Response.redirect(new URL("/login", req.nextUrl.origin));
  }
});
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
```

### Task 3.3: RBAC helper + TDD

**Files:** Create: `web-next/lib/rbac.ts`, Test: `web-next/tests/rbac.test.ts`

**Step 1 (RED):** Test:
```ts
import { canManage } from "@/lib/rbac";
test("ADMIN can manage, EVALUATOR cannot", () => {
  expect(canManage("ADMIN")).toBe(true);
  expect(canManage("EVALUATOR")).toBe(false);
});
```
Run `npm run test` → FAIL.

**Step 2 (GREEN):**
```ts
import type { Role } from "@prisma/client";
export function canManage(role?: Role | string | null) {
  return role === "ADMIN" || role === "OWNER" || role === "HR";
}
export async function requireAuth() { /* wrap auth(); throw 401 if none */ }
```
Run test → PASS. Commit.

### Task 3.4: Login page

**Files:** Create: `web-next/app/(auth)/login/page.tsx` — form email+password memanggil `signIn("credentials", {...})`, redirect ke `/dashboard`. (Port UI dari `resources/js/Pages/Auth/Login.vue`.) Verifikasi login manual dengan akun seed. Commit.

---

# FASE 4 — App Shell / Layout / Design System

### Task 4.1: Layout terproteksi (sidebar + header)

**Files:** Create: `web-next/app/(dashboard)/layout.tsx`, `components/Sidebar.tsx`, `components/Header.tsx`
- Port `resources/js/Layouts/AppLayout.vue`: sidebar collapsible (Dashboard, Attendance ▸, Directory, Assessment ▸, Settings ▸), header glassmorphism + lonceng notifikasi + profil user + logout.
- Layout ini Server Component yang cek `auth()`; jika null redirect `/login`.
- Auto-logout 15 menit inactivity → client hook `useIdleLogout`.

### Task 4.2: Layout publik & komponen UI dasar

**Files:** Create: `web-next/app/(public)/layout.tsx` (tanpa sidebar) + primitives di `components/ui/` (Button, Modal, Table, Input, Select, Card, Badge, Toast). Port style Tailwind existing. Commit per komponen.

---

# FASE 5 — Vertical Slice Referensi: Modul Employees (TEMPLATE POLA)

> Modul ini dikerjakan **lengkap end-to-end** sebagai POLA yang di-copy untuk modul CRUD lain. Setelah ini, modul serupa cukup mengikuti pola yang sama (validator zod → route handler → service → UI page).

### Task 5.1: Zod validator employee
**Files:** Create: `web-next/lib/validators/employee.ts`
```ts
import { z } from "zod";
export const employeeCreateSchema = z.object({
  fullName: z.string().min(1).max(150),
  nickname: z.string().max(50).optional(),
  departmentId: z.number().int().optional(),
  positionId: z.number().int().optional(),
  workScheduleId: z.number().int().optional(),
  joinDate: z.string().optional(),
  salary: z.number().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});
export const employeeUpdateSchema = employeeCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
});
```

### Task 5.2: Service generate employee_code + TDD
**Files:** Create: `web-next/lib/services/employee-code.ts`, Test: `tests/employee-code.test.ts`
- Port logika Laravel: format `EMP-{NICKNAME}-{SEQ}`, max 20 char, unik.
- **RED:** test `generateEmployeeCode("Budi", existingCodes)` → `"EMP-BUDI-001"`, dan increment saat sudah ada.
- **GREEN:** implementasi murni (tanpa DB) menerima daftar kode existing → mudah diuji. Wrapper DB terpisah.
- Commit setelah PASS.

### Task 5.3: Route handler list + create
**Files:** Create: `web-next/app/api/employees/route.ts`
```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { employeeCreateSchema } from "@/lib/validators/employee";
import { nextEmployeeCode } from "@/lib/services/employee-code";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  if (!(await auth())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const sp = req.nextUrl.searchParams;
  const page = Number(sp.get("page") ?? 1);
  const search = sp.get("search") ?? "";
  const departmentId = sp.get("department_id");
  const isActive = sp.get("is_active");
  const where: any = { deletedAt: null };
  if (search) where.OR = [{ fullName: { contains: search } }, { employeeCode: { contains: search } }];
  if (departmentId) where.departmentId = Number(departmentId);
  if (isActive !== null && isActive !== "") where.isActive = isActive === "true";
  const [data, total] = await Promise.all([
    prisma.employee.findMany({
      where, skip: (page - 1) * 20, take: 20, orderBy: { fullName: "asc" },
      include: { department: true, position: true, workSchedule: true },
    }),
    prisma.employee.count({ where }),
  ]);
  return NextResponse.json({ data, total, page, perPage: 20 });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = employeeCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ errors: parsed.error.flatten() }, { status: 422 });
  const code = await nextEmployeeCode(prisma, parsed.data.nickname ?? parsed.data.fullName);
  const emp = await prisma.employee.create({
    data: { ...parsed.data, employeeCode: code, publicToken: randomUUID(),
      joinDate: parsed.data.joinDate ? new Date(parsed.data.joinDate) : null },
  });
  // audit(session.user, "create", "employees", emp.id, null, emp)
  return NextResponse.json(emp, { status: 201 });
}
```

### Task 5.4: Route handler show/update/delete (soft delete)
**Files:** Create: `web-next/app/api/employees/[id]/route.ts` — GET (with relations + latestAssessment), PUT (zod update + audit), DELETE (set `deletedAt = new Date()`).

### Task 5.5: Endpoint attendance-summary per employee
**Files:** Create: `web-next/app/api/employees/[id]/attendance-summary/route.ts` — hitung `onTimeDays/lateDays/absentDays` untuk period (port `EmployeeController@getAttendanceSummary`).

### Task 5.6: Import CSV + Export PDF
**Files:** Create: `web-next/app/api/employees/import-csv/route.ts` (parse CSV, auto-create dept/position bila belum ada — reuse pola), `web-next/app/api/employees/export-pdf/route.ts` (pakai `lib/services/export/pdf.ts`).

### Task 5.7: UI halaman Employees
**Files:** Create: `web-next/app/(dashboard)/employees/page.tsx` + komponen (tabel, filter bar, modal add/edit/delete, modal assessment details, modal QR pakai `qrcode.react` link `/rate/{token}`, import/export). Port `resources/js/Pages/Employee/Index.vue`. Verifikasi CRUD end-to-end di browser. Commit.

> **Setelah Fase 5:** pola `validator → route → service → UI` sudah mapan. Modul berikut MENGIKUTI pola ini; plan hanya merinci logika non-trivial-nya.

---

# FASE 6 — Master Data, Work Schedules, Overtime Categories, Settings

### Task 6.1: Master data (departments & positions)
**Files:** `app/api/departments/route.ts` + `[id]`, `app/api/positions/route.ts` + `[id]`. CRUD sederhana + count employee. Cegah delete bila ada employee terkait.

### Task 6.2: Work schedules CRUD
**Files:** `app/api/work-schedules/route.ts` + `[id]`, UI `app/(dashboard)/settings/work-schedules/page.tsx`. Field jam/istirahat/upah/toleransi/is_holiday. Cegah delete bila dipakai employee. Port `WorkSchedules.vue`.

### Task 6.3: Overtime categories CRUD
**Files:** `app/api/overtime-categories/route.ts` + `[id]`. Enum type flat/hourly/hybrid, rate, companyContext.

### Task 6.4: Settings + holidays
**Files:** `app/api/settings/route.ts` (GET semua key-value, PUT batch upsert), `app/api/settings/holidays/route.ts` + `[id]`. UI `app/(dashboard)/settings/page.tsx`: user access, branding/subdomain, master data, holidays, konteks engine overtime, kredensial Fingerspot. Helper `lib/settings.ts` (`getSetting/setSetting`).

---

# FASE 7 — Modul Assessment

### Task 7.1: Service grade & total score + TDD
**Files:** Create: `web-next/lib/services/grade.ts`, Test: `tests/grade.test.ts`
- **RED:** `computeTotalScore(scores)` (Σ score×weight/100) & `gradeFromScore(x)` (≥4.5 Sangat Baik … <1.5 Sangat Kurang).
- **GREEN:** fungsi murni. PASS → commit.

### Task 7.2: Template & indicator CRUD
**Files:** `app/api/assessment-templates/route.ts` + `[id]`, `.../[id]/indicators/route.ts`, `app/api/assessment-indicators/[id]/route.ts`. Validasi total weight = 100%. UI `app/(dashboard)/assessments/templates/page.tsx` (nested modal indicator). Port `Templates.vue`.

### Task 7.3: Single assessment store/update
**Files:** `app/api/assessments/single/route.ts` (POST), `app/api/assessments/single/[id]/route.ts` (PUT). Hitung `weightedValue` per score, `totalScore`, `grade` (pakai service 7.1). Transisi draft→completed memicu notifikasi (Task 12.x). UI `assessments/single/page.tsx` + `assessments/single/[id]` (edit). Port CreateSingle/EditSingle.vue termasuk kartu attendance insight (panggil endpoint 5.5).

### Task 7.4: Bulk assessment
**Files:** `app/api/assessments/employees/route.ts` (list + filter), `app/api/assessment-templates/[id]/scores/route.ts` (skor terakhir per employee). UI `assessments/bulk/page.tsx`: tabel matriks employee×indicator, status Ready/Incomplete, submit via batch. Port CreateBulk.vue.

---

# FASE 8 — Modul Attendance (paling kompleks)

### Task 8.1: Index + manual + metrics
**Files:** `app/api/attendance/route.ts` (GET paginated by date/status), `app/api/attendance/manual/route.ts` (POST upsert in/out), `app/api/attendance/metrics/route.ts` (present/late/absent/recent-lates hari ini). UI `attendance/page.tsx`. Port Attendance/Index.vue.

### Task 8.2: Service report aggregation `getReportData()` + TDD  ⚠️ LOGIKA BERAT
**Files:** Create: `web-next/lib/services/attendance/report.ts`, Test: `tests/attendance-report.test.ts`
- Port method `getReportData()` (~250 baris) dari `AttendanceReportController`: group per employee per tanggal, ekstrak clockIn/clockOut, **cocokkan work schedule terdekat berdasarkan waktu scan aktual**, hitung `lateMinutes` (vs start+tolerance), `overtimeMinutes` (vs end / ≥60 menit ekstra), deteksi kategori overtime (Long Shift / Libur/Sunday), resolve absensi (no scan → cek holiday/sunday). Untuk employee spesifik: tampilkan SEMUA hari termasuk absen; untuk "all": hanya hari ada scan.
- Tulis sebagai fungsi murni menerima `{employees, attendances, schedules, holidays, range}` → array baris. **Uji dengan fixture** beberapa skenario (telat, lembur, absen, hari libur). RED→GREEN per skenario, commit tiap skenario.
- Juga port `getAnalysisData()` (hitung Izin/Sakit/Cuti/Absent/Late) & `calculateStats()` (top-5).

### Task 8.3: Report route + edit record
**Files:** `app/api/attendance/report/route.ts` (pakai service 8.2), `app/api/attendance/[id]/route.ts` (PUT edit clock in/out, recalive overtime via engine Fase 9). UI `attendance/report/page.tsx`. Port Attendance/Report.vue.

### Task 8.4: Import 2-tahap (preview + finalize)  ⚠️ LOGIKA BERAT
**Files:** Create: `web-next/lib/services/attendance/import.ts` (parser), `app/api/attendance/import/route.ts` (preview: parse Excel/XLSX/CSV/HTML via `exceljs` + fallback, deteksi header PIN/nama/tanggal/jam, match employee, warning missing-out/double-scan/overtime), `app/api/attendance/import/finalize/route.ts` (buat record setelah user mapping). Uji parser dengan fixture file. UI modal preview+mapping. Port `AttendanceController@import/finalizeImport` + `AttendanceImport`.

> Catatan: Laravel pakai PhpSpreadsheet + SimpleXLS + DOMDocument. Di Node, `exceljs` menangani XLSX/CSV; untuk XLS legacy (BIFF) pakai `xlsx` (SheetJS) sebagai fallback; HTML-table pakai parser DOM (`node-html-parser`). Tambah dep bila skenario itu benar-benar dibutuhkan (YAGNI — konfirmasi format file nyata dulu).

---

# FASE 9 — Overtime Calculation Engine (Strategy Pattern)

### Task 9.1: Kontrak + factory + TDD
**Files:** Create: `web-next/lib/services/overtime/types.ts`, `factory.ts`, `standard.ts`, `rate-my-staff.ts`, `index.ts`; Test: `tests/overtime.test.ts`
- Port `OvertimeCalculatorInterface` + `OvertimeCalculatorFactory` + 2 kalkulator.
- **StandardOvertimeCalculator:** flat → rate; hourly/hybrid → (approvedMinutes/60)×rate.
- **RateMyStaffOvertimeCalculator:** Lembur Libur → flat; Lembur Cetak → hourly; Longshift → base rate + (approvedMinutes/60)×10000 (angka bisa dari setting).
- Factory pilih engine dari setting `overtime_engine_context`.
- Fungsi murni → RED→GREEN per cabang. Commit.

### Task 9.2: Integrasi ke edit attendance & slip
**Files:** panggil engine di Task 8.3 (recalc `overtimeAmount`) dan di export slip (Fase 10).

---

# FASE 10 — Reports & Exports (PDF/Excel)

### Task 10.1: Assessment report aggregation
**Files:** `app/api/reports/route.ts` (filter period/department/performance_category/search + summary stats), `app/api/reports/employee/[id]/route.ts`, `app/api/reports/assessment/[id]/route.ts`, `app/api/reports/employee/[id]/public-feedbacks/route.ts`. UI `reports/page.tsx`. Port Report/Index.vue.

### Task 10.2: Export PDF
**Files:** Create: `web-next/lib/services/export/pdf.ts` pakai `@react-pdf/renderer`. Port template Blade: employees, assessment detail, attendance combined, absence analysis. Route `.../export-pdf`.

### Task 10.3: Export Excel (multi-sheet + slip lembur)
**Files:** Create: `web-next/lib/services/export/excel.ts` pakai `exceljs`. Port: ReportExport (1 sheet), AttendanceMerged (3 sheet: Ringkasan/Analysis/Detail), OvertimeSlip (per employee, pakai engine Fase 9). Route terkait.

---

# FASE 11 — Public Forms (token, tanpa login)

### Task 11.1: Public rate employee (QR)
**Files:** `app/api/public/employee/[token]/route.ts` (GET info), `app/api/public/employee/[token]/rate/route.ts` (POST, rate limit sederhana). Buat Assessment `isPublic=true, evaluatorId=null, totalScore=rating, status=completed, grade`. UI `app/(public)/rate/[token]/page.tsx` (star rating, glassmorphism). Port RateEmployee.vue.

### Task 11.2: Public absence form
**Files:** `app/api/public/absence-form/[token]/route.ts` (GET validasi LeaveLink + list employee, POST buat Attendance `scanType=absence`, status Izin/Sakit/Cuti). UI `app/(public)/absence/[token]/page.tsx` + `link-expired/page.tsx`. Cek expiry `LeaveLink.expiresAt`. Port AbsenceForm.vue/LinkExpired.vue. Endpoint generate link (24 jam) di `app/api/attendance/leave-link/route.ts`.

---

# FASE 12 — Dashboard & Notifications

### Task 12.1: Notifications
**Files:** `app/api/notifications/route.ts` (GET 10 terbaru), `.../[id]/mark-read/route.ts`, `.../mark-all-read/route.ts`. Helper `lib/notify.ts` (buat row Notification untuk user). Panggil saat assessment completed (Task 7.3).

### Task 12.2: Dashboard
**Files:** `app/api/dashboard/route.ts` (KPI: total employee aktif, pending reviews, avg score, notif; chart tren performa & attendance; alert dinamis; recent audit log). UI `dashboard/page.tsx` pakai `react-chartjs-2`. Port Dashboard/Index.vue. Reuse service report 8.2 untuk data chart attendance.

### Task 12.3: Audit log helper
**Files:** Create: `web-next/lib/audit.ts` — `audit(userId, action, table, targetId, oldVals, newVals, req)`. Panggil di semua mutasi CRUD (retrofit ke route sebelumnya).

---

# FASE 13 — Pondasi Cloud Mesin Absensi (Fingerspot Push Receiver)

> ⚠️ **Blocker aktif (memory `project-fingerspot-push-integration`):** format protokol mesin belum diketahui. Fase ini HANYA bangun receiver **HTTP** + penyimpanan raw + mapper. Jika mesin ternyata kirim **proprietary TCP:8014**, dibutuhkan listener di VPS publik `187.77.156.168` (di luar scope Next.js) — catat sebagai open question, jangan blok fase lain.

### Task 13.1: Endpoint webhook receiver
**Files:** Create: `web-next/app/api/fingerspot/webhook/route.ts`
- POST: terima body apa pun, simpan ke `FingerspotRawLog` (rawBody=Json, plus parse snMachine/pin/scanAt bila HTTP/JSON), return 200 cepat. Opsional cek `FINGERSPOT_WEBHOOK_SECRET`.
- Route ini sudah di-whitelist di `middleware.ts` (Task 3.2).

### Task 13.2: Mapper scanlog → attendance + TDD
**Files:** Create: `web-next/lib/services/fingerspot/mapper.ts`, Test: `tests/fingerspot-mapper.test.ts`
- Port logika `FingerspotService::processScanlogs`: map `pin` → `employee.employeeCode`, tentukan `scanType` (<12:00 in, ≥12:00 out), hitung status telat (start+tolerance), dedup `(employeeId, scanDate)`.
- Fungsi murni menerima array log ternormalisasi → daftar Attendance. RED→GREEN. Commit.

### Task 13.3: Worker proses raw log
**Files:** Create: `web-next/app/api/fingerspot/process/route.ts` (atau cron) — ambil `FingerspotRawLog` `processed=false`, jalankan mapper, buat Attendance, tandai processed. (Nanti bisa dijadwalkan.)

### Task 13.4: UI setting kredensial + status
**Files:** tambah di `settings/page.tsx`: field SN mesin, URL webhook publik (`https://app.volikoprint.com/api/fingerspot/webhook`), tabel raw log terakhir untuk verifikasi mesin sudah push.

**Open question dicatat di bagian akhir plan.**

---

# FASE 14 — Deploy di Homelab (PM2 + Cloudflare Tunnel)

> Homelab: `ssh homelab` (Ubuntu 24.04, LAN `192.168.1.50`, cloudflared jalan pakai token, routing di dashboard Cloudflare Zero Trust). sudo BUTUH password. Lihat memory `reference-attendance-machine-and-infra`.

### Task 14.1: Siapkan MySQL di homelab
**Step:** Install/aktifkan MySQL 8 di homelab (atau container). Buat DB `ratemystaff` + user. Catat `DATABASE_URL` produksi. (Jalankan sendiri via `! ssh homelab ...` bila perlu; SSH interaktif oleh user.)

### Task 14.2: Node + PM2 di homelab
**Step:**
```bash
# di homelab
node -v   # pastikan Node 20+; install via nvm bila belum
sudo npm i -g pm2
```

### Task 14.3: Build & deploy artefak
**Files:** Create: `web-next/ecosystem.config.cjs`
```js
module.exports = {
  apps: [{
    name: "ratemystaff",
    script: "node_modules/next/dist/bin/next",
    args: "start -p 3000",
    cwd: "/home/homelab/apps/ratemystaff/web-next",
    env: { NODE_ENV: "production", PORT: "3000" },
    instances: 1, exec_mode: "fork", max_memory_restart: "512M",
  }],
};
```
**Step (di homelab):**
```bash
cd /home/homelab/apps/ratemystaff/web-next
git pull            # atau rsync artefak
npm ci
npx prisma migrate deploy
npm run db:seed     # sekali saja untuk admin awal
npm run build
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup   # auto-start on boot (butuh sudo password user)
```
Expected: `pm2 status` → `ratemystaff` online; `curl localhost:3000` merespon.

### Task 14.4: Ekspos via Cloudflare Tunnel
**Step:** Di **dashboard Cloudflare Zero Trust** (bukan file lokal — tunnel homelab pakai token), tambah public hostname: `app.volikoprint.com` → `http://localhost:3000`. Verifikasi `https://app.volikoprint.com` tampil dari internet. (User yang klik di dashboard; Claude bisa bantu DNS via MCP `hostinger-api`/Cloudflare bila diberi akses.)

### Task 14.5: Set env produksi & smoke test
**Step:** Isi `.env` produksi (`DATABASE_URL`, `AUTH_SECRET` via `npx auth secret`, `NEXTAUTH_URL=https://app.volikoprint.com`, `AUTH_TRUST_HOST=true`). `pm2 restart ratemystaff`. Smoke test: login admin, buat employee, generate QR, buka `/rate/{token}` dari HP (publik). Commit config deploy.

### Task 14.6: (Opsional) Migrasi domain utama
Bila menggantikan situs Hostinger lama: arahkan domain/subdomain final, update `NEXTAUTH_URL`/`APP_URL`, nonaktifkan hosting lama setelah paritas terverifikasi. **Konfirmasi ke user sebelum menonaktifkan apa pun yang masih dipakai.**

---

## Files likely to change / create (ringkas)
- **Baru:** seluruh `web-next/**` (app, lib, components, prisma, tests, config PM2).
- **Tidak disentuh (referensi):** seluruh repo Laravel lama sampai paritas tercapai, lalu diarsipkan.

## Tests / validation
- **Unit (vitest)** wajib untuk logika berat: `grade`, `employee-code`, `attendance/report` (multi-skenario), `attendance/import` parser, `overtime` (semua cabang), `fingerspot/mapper`, `rbac`.
- **Manual/e2e:** alur login, CRUD employee, assessment single/bulk, attendance import, export PDF/Excel, public rate & absence, dashboard render, webhook Fingerspot (kirim payload contoh via `curl`).
- **Deploy smoke test:** Task 14.5.

## Risks, tradeoffs, open questions
1. **Skala rewrite besar.** ~65 endpoint + 15 halaman + logika berat (report aggregation, import 2-tahap, overtime). Mitigasi: kerjakan per fase, TDD untuk logika, Fase 5 sebagai pola. Jaga repo Laravel sebagai referensi sampai paritas.
2. **Excel legacy (XLS/HTML).** `exceljs` tak baca BIFF/HTML-as-XLS. Konfirmasi format file absensi nyata dulu; tambah `xlsx`/parser HTML hanya bila perlu (YAGNI).
3. **Soft delete di Prisma.** Tak native — semua query Employee/Assessment/WorkSchedule harus filter `deletedAt: null`. Pertimbangkan Prisma Client Extension global agar tak lupa.
4. **RBAC disederhanakan.** Spatie permission granular → enum `Role`. Bila butuh permission halus nanti, tambah tabel — bukan sekarang.
5. **⚠️ Blocker Fingerspot (OPEN).** Format protokol mesin belum diketahui (HTTP vs proprietary TCP:8014). Plan hanya bangun receiver HTTP. **Langkah berikutnya (dari memory):** intip protokol pakai VPS `187.77.156.168` listener port 8014 (user jalankan sendiri). Bila proprietary → butuh bridge di VPS, di luar Next.js.
6. **Cloudflare Tunnel = HTTP only.** Homelab tak punya IP publik langsung. Mesin absensi yang push proprietary TCP tak bisa lewat tunnel → skenario itu butuh VPS. Web app tetap aman lewat tunnel.
7. **Notifications non-poly.** Disederhanakan ke User. Bila perlu notify entitas lain, revisi skema.
8. **Data lama tidak dibawa** (keputusan user). Bila belakangan ingin riwayat, perlu skrip migrasi terpisah dari MySQL Hostinger.

---

## Handoff eksekusi
Plan siap. Rekomendasi eksekusi dengan **subagent-driven-development**: satu subagent per task, review dua tahap (spec compliance → code quality) sebelum lanjut. Mulai dari **Fase 1 → 2 → 3** (fondasi) sebelum modul fitur. Fase 13 (Fingerspot) & 14 (deploy) bisa berjalan setelah paritas fitur inti (Fase 5–12) tercapai.
