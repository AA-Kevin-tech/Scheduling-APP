import { cookies } from "next/headers";
import { verifyPayload } from "@/lib/terminal/signed-cookie";

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

type KioskPayload = { v: 1; exp: number };
type WorkerPayload = { v: 1; exp: number; employeeId: string };

export async function getTerminalCookieState(): Promise<{
  kioskActive: boolean;
  employeeId: string | null;
}> {
  const jar = await cookies();
  const t = nowSec();
  const kiosk = verifyPayload<KioskPayload>(jar.get("timeclock_kiosk")?.value);
  const worker = verifyPayload<WorkerPayload>(jar.get("timeclock_worker")?.value);
  const kioskOk = Boolean(kiosk && kiosk.v === 1 && kiosk.exp > t);
  const workerOk = Boolean(worker && worker.v === 1 && worker.exp > t);
  return {
    kioskActive: kioskOk,
    employeeId: workerOk && worker ? worker.employeeId : null,
  };
}
