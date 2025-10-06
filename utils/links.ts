import type { ExegesisContext } from "exegesis";
import type { Link } from "./types.d.ts";
import { contenttypes } from "./constants.ts";

export class Links {
  ctx: ExegesisContext;
  links: Array<Link>;
  constructor(ctx: ExegesisContext) {
    this.ctx = ctx;
    this.links = [];
  }
  public get server(): string {
    return this.ctx.api.serverObject.url;
  }

  public get format(): keyof typeof contenttypes {
    return this.ctx.params.query.f;
  }
  public get url(): string {
    return new URL(`${this.server}${this.ctx.req.url}`).toString();
  }
  public conformance(): this {
    const url = new URL(`${this.server}/conformance`);
    this.links.push({
      title: "Conformance Classes",
      href: url.toString(),
      type: "application/json",
      rel: "conformance",
    });
    return this;
  }
  public serviceDoc(): this {
    this.links.push({
      title: "Interactive Swagger-like page to explore definition",
      href: new URL(`${this.server}/api.html`).toString(),
      rel: "service-doc",
      type: "text/html",
    });
    return this;
  }

  public serviceDesc(): this {
    this.links.push({
      title: "OpenAPI object",
      href: `${this.server}/api`,
      type: contenttypes.OPENAPI_JSON,
      rel: "service-desc",
    });
    return this;
  }
  public self(): this {
    const url = new URL(this.url);
    this.links.push({
      title: "This document",
      href: url.toJSON(),
      type: contenttypes[this.ctx["ectx"]["format"]],
      rel: "self",
    });
    return this;
  }
  public alternates(alternateFormats: Array<keyof typeof contenttypes>): this {
    for (const f of alternateFormats) {
      if (f === this.ctx["ectx"]["format"]) continue;
      const url = new URL(this.url);
      url.searchParams.set("f", f);
      this.links.push({
        title: "alternate version of this resource",
        href: url.toString(),
        rel: "alternate",
        type: contenttypes[f.toUpperCase()],
      });
    }
    return this;
  }

  public collections(): this {
    this.links.push({
      title: "View Collections",
      rel: "data",
      type: "application/json",
      href: new URL(`${this.server}/collections`).toString(),
    });
    return this;
  }

  public collection(id: string): this {
    this.links.push({
      title: `${id} collection data`,
      href: new URL(`${this.server}/collections/${id}`).toString(),
      rel: "collection",
      type: contenttypes.JSON,
    });
    return this;
  }

  public items(collectionId: string): this {
    this.links.push({
      title: "View Items",
      href: new URL(
        `${this.server}/collections/${collectionId}/items`
      ).toString(),
      type: contenttypes.GEOJSON,
      rel: "items",
    });
    return this;
  }
  public itemId(collectionId: string, itemId: string): this {
    this.links.push({
      title: "View Item",
      href: new URL(
        `${this.server}/collections/${collectionId}/items/${itemId}`
      ).toString(),
      rel: "items",
      type: contenttypes.GEOJSON,
    });
    return this;
  }

  public pagination(numberMatched: number): this {
    const [limit, offset, f] = [
      this.ctx["ectx"].limit,
      this.ctx["ectx"].offset,
      this.ctx["ectx"]["format"],
    ];
    const hasPrev = offset > 0;
    const hasNext = numberMatched > limit + offset;

    const url = new URL(this.url);
    if (hasNext) {
      url.searchParams.set("offset", (limit + offset).toString());
      this.links.push({
        title: `View next page of results`,
        href: url.toString(),
        type: contenttypes[f.toUpperCase()],
        rel: "next",
      });
    }
    if (hasPrev) {
      url.searchParams.set("offset", (offset - limit).toString());
      this.links.push({
        title: `View previous page of results`,
        href: url.toJSON(),
        type: contenttypes[f.toUpperCase()],
        rel: "prev",
      });
    }

    return this;
  }
}
