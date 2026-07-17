export type RawScan = { pin: string; scanAt: string | Date };

export type MapperOptions = {
  /** Peta employee_code -> employee.id (PIN mesin dicocokkan ke employeeCode). */
  codeToId: Record<string, number>;
  /** Jam batas in/out (default 12 = siang). */
  noonHour?: number;
};

export type MappedScan = {
  employeeId: number;
  scanDate: Date;
  scanType: "in" | "out";
  pin: string;
};

function toDate(d: string | Date): Date {
  return d instanceof Date ? d : new Date(d);
}

/** Normalisasi satu scanlog mesin -> bentuk attendance. Null bila PIN tak dikenal. */
export function mapScanlog(raw: RawScan, opts: MapperOptions): MappedScan | null {
  const employeeId = opts.codeToId[raw.pin];
  if (employeeId === undefined) return null;
  const scanDate = toDate(raw.scanAt);
  const noon = opts.noonHour ?? 12;
  const scanType: "in" | "out" = scanDate.getHours() < noon ? "in" : "out";
  return { employeeId, scanDate, scanType, pin: raw.pin };
}

/** Normalisasi banyak scanlog: pisahkan cocok/tidak + dedup (employee+waktu). */
export function mapScanlogs(
  raws: RawScan[],
  opts: MapperOptions
): { mapped: MappedScan[]; unmatched: string[] } {
  const mapped: MappedScan[] = [];
  const unmatched: string[] = [];
  const seen = new Set<string>();

  for (const raw of raws) {
    const m = mapScanlog(raw, opts);
    if (!m) {
      unmatched.push(raw.pin);
      continue;
    }
    const key = `${m.employeeId}|${m.scanDate.getTime()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    mapped.push(m);
  }

  return { mapped, unmatched };
}
