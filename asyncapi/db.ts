import { randomUUID } from "node:crypto";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const database = await Deno.openKv();

class Db {
  constructor() {}

  async newItemMessage(message: Item, expireIn = DAY_IN_MS) {
    const id = this.id;
    const pubtime = this.pubtime;
    const keys = ["notifications", "item" , message.collectionId];

    if (message.instanceId) {
      // This duplicates the messages. Send message manually
      // await this.newInstanceMessage(this.#item2instance(message));
      keys.push(message.instanceId);
    }
    await database.set(
      [...keys, message.itemId, id],
      {
        ...message,
        pubtime,
        id,
      },
      { expireIn }
    );
    // This duplicates the messages. Send message manually
    //await this.newCollectionMessage(this.#item2collection(message));
  }
  async newCollectionMessage(message: Collection, expireIn = DAY_IN_MS * 4) {
    const [id, pubtime] = [this.id, this.pubtime];
    await database.set(
      ["notifications", "collection", message.collectionId, id],
      { ...message, id, pubtime },
      { expireIn }
    );
  }
  async newInstanceMessage(message: Instance, expireIn = DAY_IN_MS * 3) {
    const [id, pubtime] = [this.id, this.pubtime];
    await database.set(
      [
        "notifications",
        "instance",
        message.collectionId,
        message.instanceId,
        id,
      ],
      { ...message, id, pubtime },
      { expireIn }
    );
    // This duplicates the same event. Send message manually
    // await this.newCollectionMessage(this.#instance2collection(message));
  }
  public get pubtime() {
    return new Date().toISOString();
  }
  public get id() {
    return randomUUID();
  }

  #item2collection(message: Item): Collection {
    return {
      collectionId: message.collectionId,
      operation: "update",
    };
  }
  #item2instance(message: Item): Instance {
    return {
      instanceId: message.instanceId!,
      operation: "update",
      collectionId: message.collectionId,
    };
  }
  #instance2collection(message: Instance): Collection {
    return {
      ...message,
      operation: "update",
    };
  }
  async getItemNotifications(collectionId?: string) {
    const keys = ["notifications", "item"];
    if (collectionId) keys.push(collectionId);
    return await database.get<Item>(keys);
  }

  async getCollectionNotifications(collectionId?: string) {
    const keys = ["notifications", "collection"];
    if (collectionId) keys.push(collectionId);
    return await database.get<Collection>(keys);
  }
  async getInstanceNotifications(collectionId: string) {
    const keys = ["notifications", "instance", collectionId];
    return await database.get<Collection>(keys);
  }
  public get db() {
    return database;
  }
}
export type Item = {
  itemId: string;
  geometry: GeoJSON.Geometry;
  operation: Operation;
  collectionId: string;
  instanceId?: string;
  [x: string]: any;
};

export type Collection = {
  collectionId: string;
  operation: Operation;
};

export type Metadata = {
  pubtime: string;
  id: string;
};
export type Instance = Omit<Collection, "type"> & {
  instanceId: string;
};
export type Operation = "delete" | "update" | "create";
type Pubtime = string;

const db = new Db();

export default db;
