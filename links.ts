import { contenttypes, type Link, Links as Links_ } from "./utils/index.ts";
import type { ExegesisContext } from "exegesis-express";

export class Links extends Links_ {
  constructor(ctx: ExegesisContext) {
    super(ctx);
  }
  public instances(collectionId: string): this {
    this.links.push({
      title: "View Instance",
      href: new URL(
        `${this.server}/collections/${collectionId}/instances`,
      ).toJSON(),
      rel: "data",
      type: contenttypes.JSON,
    });
    return this;
  }

  instance(collectionId: string, instanceId: string): this {
    this.links.push({
      title: "Instance",
      href: new URL(
        `${this.server}/collections/${collectionId}/instances/${instanceId}`,
      ).toJSON(),
      rel: "collection",
      type: contenttypes.JSON,
    });
    return this;
  }
  queryType(
    query_type: string,
    default_output_format: keyof typeof contenttypes,
  ): Link {
    const { collectionId, instanceId } = this.ctx.params.path;
    let str = `/collections/${collectionId}`;
    if (instanceId) str += `/instances/${instanceId}`;
    str += `/${query_type}`;
    return {
      title: `Query this dataset using ${query_type}`,
      href: new URL(this.server + str).toString(),
      type: contenttypes[default_output_format],
      rel: query_type === "items" ? "items" : "data",
      templated: false,
    };
  }

  location(
    collectionId: string,
    locationId: string,
    options: { instanceId?: string },
  ) {
    let str = `/collections/${collectionId}`;
    if (options.instanceId) str += `/instances/${options.instanceId}`;
    str += `/locations/${locationId}`;
    return new URL(`${this.server}${str}`).toJSON();
  }
}
