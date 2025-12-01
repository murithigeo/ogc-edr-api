import { contenttypes, type Link, Links as Links_ } from "./utils/index.ts";
import type { ExegesisContext } from "exegesis-express";
export class Links extends Links_ {
  constructor(ctx: ExegesisContext) {
    super(ctx);
  }
  public instances(collectionId: string): this {
    const channel = `/collections/${collectionId}/instances`;
    let url = new URL(this.server + channel);
    this.links.push({
      title: "Discover instances within this dataset",
      href: url.toString(),
      rel: "data",
      type: contenttypes.JSON,
    });

    return this;
  }
  ws(channel: string,type=contenttypes.JSON): this {
    this.links.push({
      title: "Subscribe to realtime updates for this resource",
      href: this.server,
      rel: "hub",
      channel,
      type
    });
    return this;
  }

  
  instance(collectionId: string, instanceId: string): this {
    let title = "View metadata about instance";
    const channel = `/collections/${collectionId}/instances/${instanceId}`;
    let url = new URL(this.server + channel);
    this.links.push({
      title,
      href: url.toJSON(),
      rel: "collection",
      type: contenttypes.JSON,
    });
    return this;
  }
  queryType(
    query_type: string,
    default_output_format: keyof typeof contenttypes
  ): Link {
    const { collectionId, instanceId } = this.ctx.params.path;
    let str = `/collections/${collectionId}`;
    if (instanceId) str += `/instances/${instanceId}`;
    str += `/${query_type}`;
    return {
      title: `Query this dataset using ${query_type}`,
      href: new URL(this.server + str).toString(),
      type: contenttypes[default_output_format],
      rel:
        query_type === "items" || query_type === "locations" ? "items" : "data",
      templated: false,
    };
  }
  location(
    collectionId: string,
    locationId: string,
    options: { instanceId?: string }
  ) {
    let str = `/collections/${collectionId}`;
    if (options.instanceId) str += `/instances/${options.instanceId}`;
    str += `/locations/${locationId}`;
    return new URL(`${this.server}${str}`).toJSON();
  }
}
