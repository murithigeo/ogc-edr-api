import { describe, expect, it } from 'vitest';
import Schema from 'typebox/schema';
import { LandingPageSchema } from '../../../src/standards/edr/schemas/landing-page.ts';

describe('http://www.opengis.net/spec/ogcapi-edr-1/1.1/conf/core', () => {
  describe('B.2.2. Landing Page {root}/', async () => {
    const res = await fetch('http://host.docker.internal:80/');
    it('Validate that a document was returned with a status code 200', () =>
      expect(res.status).toBe(200));
    it('The returned document conforms to /conf/core/root-success', async () => {
      const [, errors] = Schema.Compile(LandingPageSchema).Errors(await res.json());
      expect(errors.length).toBe(0);
    });
    it('');
  });
});
