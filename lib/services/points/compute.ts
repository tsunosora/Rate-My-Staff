import type { PointRates } from "./rates";

/**
 * Perhitungan poin harian. Modul murni — satu hari masuk, rincian poin keluar.
 * Dipakai saat menyimpan PointEntry maupun saat menampilkan di portal.
 */

export type DayActivity = {
  date: string;
  /** Total omzet orang ini hari itu (kasir + desain + produksi). */
  omzet: number;
  transactions: number;
  designJobs: number;
  /** Nilai jasa desain hari itu — memberi bobot pada desain yang sulit. */
  designServiceValue: number;
  operatorJobs: number;
  tasksOnTime: number;
  tasksLate: number;
  /** Hadir dan tidak telat hari itu. */
  onTime: boolean;
};

export type DayPoints = {
  date: string;
  omzetPoints: number;
  jobPoints: number;
  taskPoints: number;
  attendancePoints: number;
  total: number;
};

/** Poin satu hari. Semua dibulatkan ke bawah — tak ada poin pecahan. */
export function computeDayPoints(day: DayActivity, rates: PointRates): DayPoints {
  const omzetPoints = Math.floor(Math.max(0, day.omzet) / rates.omzetPerPoint);

  const jobPoints =
    Math.floor(day.transactions * rates.perTransaction) +
    Math.floor(day.designJobs * rates.perDesignJob) +
    // Jasa desain di PosPro berjenjang (Easy/Standar/Medium/Hard); nilainya dipakai
    // sebagai bobot supaya desain sulit tidak dihargai sama dengan yang mudah.
    Math.floor(Math.max(0, day.designServiceValue) / rates.designValuePerPoint) +
    Math.floor(day.operatorJobs * rates.perOperatorJob);

  const taskPoints =
    day.tasksOnTime * rates.perTaskOnTime + day.tasksLate * rates.perTaskLate;

  const attendancePoints = day.onTime ? rates.perOnTimeDay : 0;

  return {
    date: day.date,
    omzetPoints,
    jobPoints,
    taskPoints,
    attendancePoints,
    total: omzetPoints + jobPoints + taskPoints + attendancePoints,
  };
}

export type PointBreakdown = {
  omzetPoints: number;
  jobPoints: number;
  taskPoints: number;
  attendancePoints: number;
  total: number;
};

/** Jumlahkan poin beberapa hari. */
export function sumPoints(days: DayPoints[]): PointBreakdown {
  return days.reduce<PointBreakdown>(
    (a, d) => ({
      omzetPoints: a.omzetPoints + d.omzetPoints,
      jobPoints: a.jobPoints + d.jobPoints,
      taskPoints: a.taskPoints + d.taskPoints,
      attendancePoints: a.attendancePoints + d.attendancePoints,
      total: a.total + d.total,
    }),
    { omzetPoints: 0, jobPoints: 0, taskPoints: 0, attendancePoints: 0, total: 0 }
  );
}

/**
 * Penjelasan cara poin didapat — ditampilkan apa adanya ke karyawan supaya
 * angkanya tidak terasa muncul entah dari mana.
 */
export function explainRates(rates: PointRates): { label: string; value: string }[] {
  const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
  return [
    { label: "Omzet", value: `1 poin tiap ${rp(rates.omzetPerPoint)}` },
    { label: "Nota / closing", value: `${rates.perTransaction} poin per nota` },
    { label: "Order desain", value: `${rates.perDesignJob} poin per order` },
    { label: "Bobot kesulitan desain", value: `1 poin tiap ${rp(rates.designValuePerPoint)} nilai jasa desain` },
    { label: "Kartu produksi", value: `${rates.perOperatorJob} poin per kartu` },
    { label: "Task tepat waktu", value: `${rates.perTaskOnTime} poin` },
    { label: "Task terlambat", value: `${rates.perTaskLate} poin` },
    { label: "Hadir tepat waktu", value: `${rates.perOnTimeDay} poin per hari` },
  ];
}
