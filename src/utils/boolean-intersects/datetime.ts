import type { DateTime } from "../plugins/datetime.ts";

export default function (datetime1?: DateTime) {
  return (datetime2: string): boolean => {
    if (!datetime1) return true;
    const epoch = new Date(datetime2).getTime();
    if (typeof datetime1 === "string") return new Date(datetime1).getTime() === epoch;

    let mincheck = true;
    let maxcheck = true;
    if (datetime1.min) mincheck = new Date(datetime1.min).getTime() <= epoch;
    if (datetime1.max) maxcheck = new Date(datetime1.max).getTime() >= epoch;
    return mincheck && maxcheck;
  };
}
