import { HttpError } from 'exegesis';
export type Z = number[] | Partial<Record<'min' | 'max', number>>;
/**
 * Given a string
 */
export default function (z: string): Z {
  let value: Z;
  if (z.startsWith('R')) {
    value = [];
    const parts = z
      .substring(1)
      .split('/')
      .map((v) => {
        const x = parseFloat(v);
        if (isNaN(x)) throw new HttpError(400, 'Unable to derive number from z param');
        return x;
      });

    const [num, start, Δ] = parts;
    for (let n = 1; n < num; n++) {
      value.push(start + (n - 1) * Δ);
    }
  } else {
    if (z.includes(',')) {
      value = z.split(',').map((x) => {
        const v = parseFloat(x);
        if (isNaN(v))
          throw new HttpError(400, 'z: Comma delimited list contains non-numeric values');
        return v;
      });
    } else {
      value = z.split('/').reduce(
        (l, r, i) => {
          const val = parseFloat(r);
          if (isNaN(val)) throw new HttpError(400, 'z: contains non-numeric values');
          if (!i) l['min'] = val;
          else l.max = val;
          return l;
        },
        {} as Record<'min' | 'max', number>,
      );
    }
  }
  return value;
}
