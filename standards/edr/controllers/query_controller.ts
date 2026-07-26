import type { ExegesisOptions, PromiseController } from 'exegesis';
import type { ExegesisContext } from 'exegesis-express';
import services from '../../../services/index.ts';

function radius(ctx: ExegesisContext) {}
function cube(ctx: ExegesisContext) {}
function area(ctx: ExegesisContext) {}
function trajectory(ctx: ExegesisContext) {}
function corridor(ctx: ExegesisContext) {}
function position(ctx: ExegesisContext) {}
function locations(ctx: ExegesisContext) {}
function items(ctx: ExegesisContext) {}
export default {
  // radius
  'get:radius:collection': (ctx) => radius(ctx),
  'post:radius:collection': (ctx) => radius(ctx),
  'get:radius:instance': (ctx) => radius(ctx),
  'post:radius:instance': (ctx) => radius(ctx),
  // cube
  'get:cube:collection': (ctx) => cube(ctx),
  'post:cube:collection': (ctx) => cube(ctx),
  'get:cube:instance': (ctx) => cube(ctx),
  'post:cube:instance': (ctx) => cube(ctx),
  // area
  'get:area:collection': (ctx) => area(ctx),
  'post:area:collection': (ctx) => area(ctx),
  'get:area:instance': (ctx) => area(ctx),
  'post:area:instance': (ctx) => area(ctx),
  // trajectory
  'get:trajectory:collection': (ctx) => trajectory(ctx),
  'post:trajectory:collection': (ctx) => trajectory(ctx),
  'get:trajectory:instance': (ctx) => trajectory(ctx),
  'post:trajectory:instance': (ctx) => trajectory(ctx),
  // corridor
  'get:corridor:collection': (ctx) => corridor(ctx),
  'post:corridor:collection': (ctx) => corridor(ctx),
  'get:corridor:instance': (ctx) => corridor(ctx),
  'post:corridor:instance': (ctx) => corridor(ctx),
  // position
  'get:position:collection': (ctx) => position(ctx),
  'post:position:collection': (ctx) => position(ctx),
  'get:position:instance': (ctx) => position(ctx),
  'post:position:instance': (ctx) => position(ctx),
  // items
  'get:items:collection:list': (ctx) => items(ctx),
  'post:items:collection:list': (ctx) => items(ctx),
  'get:items:collection:item': (ctx) => items(ctx),
  'post:items:collection:item': (ctx) => items(ctx),
  'get:items:instance:list': (ctx) => items(ctx),
  'post:items:instance:list': (ctx) => items(ctx),
  'get:items:instance:item': (ctx) => items(ctx),
  'post:items:instance:item': (ctx) => items(ctx),
  // locations
  'get:locations:collection:list': (ctx) => locations(ctx),
  'post:locations:collection:list': (ctx) => locations(ctx),
  'get:locations:collection:item': (ctx) => locations(ctx),
  'post:locations:collection:item': (ctx) => locations(ctx),
  'get:locations:instance:list': (ctx) => locations(ctx),
  'post:locations:instance:list': (ctx) => locations(ctx),
  'get:locations:instance:item': (ctx) => locations(ctx),
  'post:locations:instance:item': (ctx) => locations(ctx),
} satisfies Record<string, PromiseController>;
