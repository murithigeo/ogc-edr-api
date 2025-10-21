import { type KvKey, openKv } from "@deno/kv";
import { randomUUID } from "node:crypto";
import type e from "express";

const db = await openKv(undefined, { implementation: "in-memory" });

/**
 * Handling message ids -> randomUUID
 * If an item is modified, then the collection keystore must be updated
 * Similarly, if an instance is defined, then the instance keystore must be modified
 * If an instance is modified, then the collection keystore must be modified
 */

export class MessageManager {
  constructor() {}

  async newmessage(message: Collection | Instance | Item) {
    const messages = Array<Item | Collection | Instance>();
    if (message.type === "item") {
      messages.push(this.#item2collection(message));
      messages.push(this.#item2instance(message));
    }
    if (message.type === "instance") {
      messages.push(this.#instance2collection(message));
    }
    messages.push({ ...message });
    for (const message of messages) {
      const [id, pubtime] = [randomUUID(), new Date().toISOString()];
      const mess = { ...message, id, pubtime };
      console.log(
        `New Message: ${mess.type} collectionId:${mess.collectionId} instanceId:${
          mess["instanceId"]
        } itemId:${mess["itemId"]}`,
      );
      if (message.type === "collection") {
        const { value } = await db.get<
          (Collection & { id: string; pubtime: string })[]
        >(["messages", "collection"]);
        await db.set(["messages", "collection"], [...(value ?? []), mess]);
        continue;
      }
      if (message.type === "instance") {
        const { value } = await db.get<
          (Instance & { id: string; pubtime: string })[]
        >(["messages", "instance"]);
        await db.set(["messages", "instance"], [...(value ?? []), mess]);
        continue;
      }
      const { value } = await db.get<
        (Item & { id: string; pubtime: string })[]
      >(["messages", "item"]);
      await db.set(["messages", "item"], [...(value ?? []), mess]);
    }
    // return this;
  }
  #item2collection(message: Item): Collection {
    return {
      type: "collection",
      operation: "update",
      collectionId: message.collectionId,
    };
  }
  #item2instance(message: Item): Instance {
    return {
      type: "instance",
      collectionId: message.collectionId,
      operation: "update",
      instanceId: message.instanceId,
    };
  }
  #instance2collection(message: Instance): Collection {
    return {
      type: "collection",
      collectionId: message.collectionId,
      operation: "update",
    };
  }
  public get messagesByType() {
    return async <T extends Instance | Item | Collection>(type: T["type"]) => {
      return await db.get<(T & { pubtime: string; id: string })[]>([
        "messages",
        type,
      ]);
    };
  }

  public async watch<T>(key: KvKey[]) {
    const stream = db.watch<(T & { id: string; pubtime: string })[][]>(key);
    return await stream.getReader().read();
  }
}
export type Item = {
  type: "item";
  itemId: string;
  geometry: GeoJSON.Geometry;
  operation: Operation;
  collectionId: string;
  instanceId?: string;
  [x: string]: any;
};

type Type = (Collection | Instance | Item)["type"];
export type Collection = {
  type: "collection";
  collectionId: string;
  operation: Operation;
};

export type Instance = Omit<Collection, "type"> & {
  instanceId: string;
  type: "instance";
};
export type Operation = "delete" | "update" | "create";
type Pubtime = string;


export default db;