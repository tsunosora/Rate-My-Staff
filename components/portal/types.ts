/** Bentuk data yang dikirim API portal karyawan (/api/public/portal/[token]/*). */

export type PortalEmployeeInfo = {
  fullName: string;
  nickname: string | null;
  position: string | null;
  department: string | null;
  photoPath: string | null;
};

export type PortalState = {
  employee: PortalEmployeeInfo;
  pinSet: boolean;
  authenticated: boolean;
};

export type AttendanceRow = {
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  status: string;
  shift: string | null;
  lateMinutes: number;
  overtimeMinutes: number;
  isHoliday: boolean;
  absenceReason: string | null;
};

export type AttendanceSummary = {
  present: number;
  onTime: number;
  late: number;
  longshift: number;
  absent: number;
  leave: number;
  holiday: number;
  totalLateMinutes: number;
  totalOvertimeMinutes: number;
  attendanceRate: number;
};

export type ScoreRow = {
  indicator: string;
  category: string;
  weight: number;
  score: number;
  weightedValue: number;
  notes: string | null;
};

export type Assessment = {
  id: number;
  date: string;
  period: string | null;
  totalScore: number;
  grade: string | null;
  template: string;
  evaluatorNotes: string | null;
  developmentPlan: string | null;
  recommendation: string | null;
  scores: ScoreRow[];
};

export type ReceiptTotals = {
  lsCount: number;
  lcHours: number;
  llCount: number;
  dailyAmount: number;
  holidayAmount: number;
  cetakAmount: number;
  overtimeMinutes: number;
  overtimeAmount: number;
  holidayOvertimeMinutes: number;
  holidayOvertimeAmount: number;
  mealCount: number;
  mealAmount: number;
  undertimeMinutes: number;
  grandTotal: number;
};

export type Receipt = {
  monthLabel: string;
  flexible: boolean;
  labels: {
    daily: string;
    holiday: string;
    cetak: string;
    flexOvertime: string;
    flexHoliday: string;
    meal: string;
  };
  totals: ReceiptTotals;
};

export type PosproKpi = {
  userId: number;
  name: string;
  branchId: number | null;
  isActive: boolean;
  csRating: { count: number; avgStars: number; satisfiedCount: number; satisfactionRate: number };
  tasks: { assigned: number; done: number; late: number; completionRate: number };
  sales: { transactions: number; grandTotal: number; averageTicket: number };
};

export type Overview = {
  period: { label: string; startStr: string; endStr: string; year: number; month: number };
  attendance: { summary: AttendanceSummary; rows: AttendanceRow[] };
  receipt: Receipt | null;
  assessment: {
    latest: Assessment | null;
    history: { id: number; date: string; totalScore: number; grade: string | null; period: string | null }[];
    average: number;
  };
  publicFeedback: {
    average: number;
    count: number;
    items: { id: number; date: string; stars: number; raterName: string | null; comment: string | null }[];
  };
  /** null = karyawan belum dipetakan ke akun PosPro, atau PosPro tak bisa dihubungi. */
  pospro: PosproKpi | null;
};

export type LeaveRequestItem = {
  id: number;
  startDate: string;
  endDate: string;
  days: number;
  type: string;
  reason: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  decisionNote: string | null;
  decidedAt: string | null;
  createdAt: string;
};
