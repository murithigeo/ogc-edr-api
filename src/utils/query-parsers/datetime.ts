// import type { HasFunction } from '../services/types.d.ts';

export type DateTime = string | Partial<Record<'min' | 'max', string>> | string[];

export default function (datetime: string): DateTime {
  let value: DateTime;
  if (datetime.includes('/')) {
    value = {};
    [value.min, value.max] = datetime.replace('../', '/').replace('/..', '/').split('/');
    if (datetime.startsWith('/')) delete value.min;
    if (datetime.endsWith('/')) delete value.max;
  } else value = datetime.split(',');
  return value;
}
