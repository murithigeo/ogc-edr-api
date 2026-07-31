import type { PromiseController } from 'exegesis-express';
import type { LandingPage } from '../edr.d.ts';
import { Links } from '../../../utils/index.ts';

const getLandingPage: PromiseController = async (ctx) => {
  const json: LandingPage = {
    title: 'OGC API EDR Demo implementation',
    description: 'API implementation in TypeScript',
    contact: {
      email: 'murithiedwing@gmail.com',
      phone: '+2547-xxx-xxx-xx',
      city: 'Nairobi',
      country: 'Kenya',
      stateorprovince: 'Nairobi County',
      instructions: 'None',
      hours: '0800-1600H',
    },
    provider: { name: 'None', url: 'https://murithigeo.vercel.app' },
    links: new Links(ctx).collections().serviceDesc().serviceDoc().conformance().links,
  };
  ctx.res.setBody(json);
};

// For each of all collections, get their ids and possibly their instances
//
// /collections/{id}/instances/query_type
const getRobotsTxt: PromiseController = async (ctx) => {
  ctx.res.status(200).set('content-type', 'text/plain');
};

export default { getLandingPage, getRobotsTxt };
