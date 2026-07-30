import { afterAll, beforeAll } from 'vitest';
import edr from './standards/edr/index.ts';

beforeAll(() => {
  const port = 80;
  edr.listen(port, '0.0.0.0', () => console.log(`EDR listening on port:${port}`));
  console.log('fhfhhfh');

  fetch('http://host.docker.internal').then((r) => console.log(r));
});
