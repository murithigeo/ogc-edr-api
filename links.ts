import { contenttypes, type Link, Links as Links_ } from "./utils/index.ts";
import type { ExegesisContext } from "exegesis-express";
import process from "node:process";
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
    url = new URL(this.server);
    url.protocol = this.wsProtocol;
    this.links.push({
      title: "Receive updates about instances in this dataset",
      href: url.toString().slice(0, -1),
      channel,
      rel: "hub",
    });
    return this;
  }

  public get wsProtocol() {
    return (process.env.NODE_ENV === "production") ? "wss" : "ws";
  }
  override collection(id: string): this {
    super.collection(id);
    const channel = `/collections/${id}`;
    const url = new URL(this.server);
    url.protocol = this.wsProtocol;
    this.links.push({
      type: "application/json",
      rel: "hub",
      href: url.toString().slice(0, -1),
      title: "Receive updates to collection in realtime",
      channel,
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
    url.protocol = this.wsProtocol;
    title = "Receive updates on instance as soon as they happen";
    url = new URL(this.server);
    url.protocol = this.wsProtocol;
    this.links.push({
      title,
      href: url.toJSON().slice(0, -1),
      type: "application/json",
      rel: "hub",
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
      rel: query_type === "items" || query_type === "locations"
        ? "items"
        : "data",
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

  override items(collectionId: string, instanceId?: string): this {
    let channel = `/collections/${collectionId}`;
    if (instanceId) channel += `/instances/${instanceId}`;
    channel += `/items`;
    if (!instanceId) super.items(collectionId);
    else {
      this.links.push({
        title: "Discover items in instance",
        href: new URL(this.server + channel).toString(),
        rel: "items",
        type: "application/geo+json",
      });
    }

    const url = new URL(this.server);
    url.protocol = this.wsProtocol;
    this.links.push({
      title: "Realtime updates to items in this dataset",
      href: url.toString().slice(0, -1),
      channel,
      rel: "hub",
    });
    return this;
  }

  override itemId(
    collectionId: string,
    itemId: string,
    instanceId?: string,
  ): this {
    let channel = `/collections/${collectionId}`;
    if (instanceId) channel += `/instances/${instanceId}`;
    channel += `/items/${itemId}`;
    if (!instanceId) super.itemId(collectionId, itemId);
    else {this.links.push({
        title: "Discover items in instance",
        href: new URL(this.server + channel).toString(),
        rel: "item",
        type: "application/geo+json",
      });}
    const url = new URL(this.server);
    url.protocol = this.wsProtocol;
    this.links.push({
      title: "Realtime updates to this item",
      channel,
      href: url.toString().slice(0, -1),
      rel: "hub",
    });
    return this;
  }
}
