import type { ExegesisContext } from 'exegesis-express';
import type { Link } from './types/features.d.ts';
import { contentTypes, type ContentTypeNegotiator } from './content-types.ts';

export class Links {
  origin: string;
  pathname: string;
  url: string;
  format: ContentTypeNegotiator;
  limit = 0;
  offset = 0;
  collectionId?: string;
  locId?: string;
  itemId?: string;
  instanceId?: string;
  cache: Set<Link>;
  constructor(ctx: ExegesisContext) {
    const { collectionId, instanceId } = ctx.params.path;
    this.origin = ctx.api.serverObject!.url;
    this.pathname = ctx.req.url!;
    this.format = ctx.params.query.f;
    this.url = new URL(this.origin + this.pathname).toJSON();
    this.offset = ctx.params.query.offset;
    this.limit = ctx.params.query.limit;
    this.collectionId = collectionId;
    this.instanceId = instanceId;
    this.cache = new Set();
  }

  conformance(): this {
    this.cache.add({
      title: 'Conformance Classes',
      href: new URL(`${this.origin}/conformance`).toString(),
      type: 'application/json',
      rel: 'conformance',
    });
    return this;
  }
  private set link(link: Link) {
    this.cache.add(structuredClone(link));
  }
  serviceDoc(): this {
    this.cache.add({
      title: 'Interactive Swagger-like page to explore definition',
      href: new URL(`${this.origin}/api.html`).toString(),
      rel: 'service-doc',
      type: 'text/html',
    });
    return this;
  }

  serviceDesc(): this {
    this.cache.add({
      title: 'OpenAPI object',
      href: `${this.origin}/api`,
      type: contentTypes.OPENAPI_JSON,
      rel: 'service-desc',
    });
    return this;
  }
  self(): this {
    const url = new URL(this.url);
    url.searchParams.set('f', this.format);
    this.cache.add({
      title: 'This document',
      href: url.toJSON(),
      type: contentTypes[this.format],
      rel: 'self',
    });
    return this;
  }
  alternates(...alternates: ContentTypeNegotiator[]): this {
    for (const f of alternates) {
      if (f === this.format) continue;
      const url = new URL(this.url);
      url.searchParams.set('f', f);
      this.cache.add({
        title: 'alternate version of this resource',
        href: url.toString(),
        rel: 'alternate',
        type: contentTypes[f],
      });
    }
    return this;
  }

  collections(): this {
    this.cache.add({
      title: 'View Collections',
      rel: 'data',
      type: 'application/json',
      href: new URL(`${this.origin}/collections`).toString(),
    });
    return this;
  }

  collection(id: string, instanceId?: string): this {
    let href = this.origin + `/collections/${id}`;
    if (instanceId !== undefined) href += `/instances/${instanceId}`;
    this.cache.add({
      title: `${id} collection data`,
      href,
      rel: 'collection',
      type: contentTypes.JSON,
    });
    return this;
  }

  /**
   * Assumes you are at /collections/{collectionId}/[instances/{instanceId}/]
   */
  items(collectionId = this.collectionId): this {
    this.cache.add({
      title: 'View Items',
      href: new URL(`${this.origin}/collections/${collectionId}/items`).toString(),
      type: contentTypes.GEOJSON,
      rel: 'items',
    });
    return this;
  }
  /**
   * Assumes that you are /collections/{collectionId}[/instances/{instanceId}]/items
   */
  toItem(itemId: string | number): this {
    const { collectionId } = this;
    let pathname = `/collections/${collectionId}`;
    if (this.instanceId) pathname += `/instances/${this.instanceId}`;
    pathname += `/items/${itemId!}`;
    this.link = {
      title: 'View Item',
      href: new URL(this.origin + pathname).toString(),
      rel: 'items',
      type: contentTypes.GEOJSON,
    };
    return this;
  }

  pagination(numberMatched: number): this {
    const { limit, offset } = this;
    const hasPrev = offset > 0;
    const hasNext = numberMatched > limit + offset;

    const url = new URL(this.url);
    if (hasNext) {
      url.searchParams.set('offset', (limit + offset).toString());
      this.cache.add({
        title: `View next page of results`,
        href: url.toString(),
        type: contentTypes[this.format],
        rel: 'next',
      });
    }
    if (hasPrev) {
      url.searchParams.set('offset', (offset - limit).toString());
      this.cache.add({
        title: `View previous page of results`,
        href: url.toJSON(),
        type: contentTypes[this.format],
        rel: 'prev',
      });
    }
    return this;
  }
  edrqueryendpoint(locationId: string) {
    let href = this.origin + `/collections/${this.collectionId}`;
    if (this.instanceId) href += `/instances/${this.instanceId}`;
    href += `/locations/${locationId}`;
    return encodeURI(href);
  }
  get links() {
    return Array.from(this.cache);
  }
}
