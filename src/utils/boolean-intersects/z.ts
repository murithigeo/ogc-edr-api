import type { Z } from "../plugins/z.ts";

export default function (z1?: Z) {
  return (z2: number) => {
    if (!z1) return true;
    if (Array.isArray(z1)) {
      for (let i of z1) {
        if (z2 == i) return true;
      }
      return false;
    }
    return z2 >= z1.min && z2 <= z1.max;
  };
}
