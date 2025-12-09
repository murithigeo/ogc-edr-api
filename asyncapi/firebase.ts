import { randomUUID, UUID } from "node:crypto";
import { initializeApp } from "firebase/app";
import { env } from "node:process";
import {
  getDatabase,
  ref,
  get,
  child,
  remove,
  update,
} from "firebase/database";

// 2025-12-09T14:44:100;
export const DEPLOY_ID = `${process.env.NODE_ENV || "development"}-${
  new Date().toISOString().split(".")[0]
}`;

// Init config
const firebase = initializeApp({
  apiKey: env.FIREBASE_API_KEY,
  authDomain: env.FIREBASE_AUTH_DOMAIN,
  databaseURL: env.FIREBASE_DATABASE_URL,
  projectId: env.FIREBASE_PROJECT_ID,
  storageBucket: env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
  appId: env.FIREBASE_APP_ID,
  measurementId: env.FIREBASE_MEASUREMENT_ID,
});
export type Metadata = {
  id: UUID;
  pubtime: string;
  expireIn: number;
  operation: "update" | "delete" | "create";
};

export type CollectionType = Metadata & { collectionId: string };

export type ItemType = Metadata & {
  collectionId: string;
  instanceId?: string;
  geometry: GeoJSON.Geometry;
  itemId: string;
  // [x: string]: any;
};
export type InstanceType = Metadata & {
  collectionId: string;
  instanceId: string;
};
export type Database = {
  // notifications: {
  collections: {
    [collectionId: string]: {
      [id: UUID]: Metadata & { collectionId: string };
    };
  };
  items: {
    [collectionId: string]: {
      [itemId: string]: {
        [id: UUID]: ItemType;
      };
    };
  };
  instances: {
    [collectionId: string]: {
      [instanceId: string]: {
        [id: UUID]: InstanceType;
      };
    };
  };
  // };
};

const database_ = getDatabase(firebase);
// Purge Data older than 24 hours, Firebase Free RD has a limit of 1Gb

const DAY_IN_MS = 24 * 60 * 60 * 1000;
// const deleteIn = new Date().getTime() + DAY_IN_MS;
class RealtimeDbManager {
  updates: { [path: string]: CollectionType | ItemType | InstanceType } = {};
  database = database_; //ref(database_, "/notifications");
  constructor() {}

  newCollectionMessages(
    messages: (Pick<Metadata, "operation"> & {
      collectionId: string;
    })[],
    expireIn = DAY_IN_MS
  ): this {
    const updates: { [x: string]: CollectionType } = {};
    for (const i of messages) {
      const [id, pubtime] = [this.#id, this.#pubtime];
      updates[
        `${DEPLOY_ID}/notifications/collections/${i.collectionId}/${id}`
      ] = {
        ...i,
        expireIn: this.#expireIn(expireIn),
        id,
        pubtime,
      };
    }
    this.updates = { ...this.updates, ...updates };
    return this;
    // await update(ref(this.database), updates);
  }
  newItemMessages(
    message: (Pick<Metadata, "operation"> & {
      instanceId?: string;
      collectionId: string;
      itemId: string;
      geometry: GeoJSON.Geometry;
      // [x: string]: any;
    })[],
    expireIn = DAY_IN_MS
  ) {
    const updates: { [x: string]: ItemType } = {};
    for (const i of message) {
      const [id, pubtime] = [this.#id, this.#pubtime];

      updates[
        `${DEPLOY_ID}/notifications/items/${i.collectionId}/${i.itemId}/${id}`
      ] = {
        ...i,
        id,
        pubtime,
        expireIn: this.#expireIn(expireIn),
      };
    }

    // await update(ref(this.database), updates);
    this.updates = { ...this.updates, ...updates };
    return this;
  }
  newInstanceMessages(
    message: (Pick<Metadata, "operation"> & {
      instanceId: string;
      collectionId: string;
    })[],
    expireIn = DAY_IN_MS
  ) {
    const updates: { [x: string]: InstanceType } = {};
    for (const i of message) {
      const [id, pubtime] = [this.#id, this.#pubtime];
      updates[
        `${DEPLOY_ID}/notifications/instances/${i.collectionId}/${i.instanceId}/${id}`
      ] = { ...i, pubtime, id, expireIn: this.#expireIn(expireIn) };
    }
    this.updates = { ...this.updates, ...updates };
    return this;
  }

  get #id() {
    return randomUUID();
  }
  get #pubtime() {
    return new Date().toISOString();
  }
  #expireIn(duration = DAY_IN_MS) {
    return new Date().getTime() + duration;
  }

  async commitMessages(): Promise<this> {
    await update(ref(this.database), this.updates);

    this.updates = {};
    return this;
  }
  // async deleteCollectionMessage(collectionId: string, id: UUID) {}
  async deleteExpiredItemMessages() {
    const snapshot = await get(
      child(ref(this.database), `${DEPLOY_ID}/notifications/items`)
    );
    if (!snapshot.exists()) return;
    const data: Database["items"] = snapshot.val();
    for (const collectionId of Object.keys(data)) {
      for (const itemId of Object.keys(data[collectionId])) {
        for (const uuid of Object.keys(data[collectionId][itemId])) {
          const val: ItemType = data[collectionId]![itemId]![uuid]!;
          if (new Date().getTime() > new Date(val.expireIn).getTime()) {
            await remove(
              ref(
                this.database,
                `${DEPLOY_ID}/notifications/items/${collectionId}/${itemId}/${uuid}`
              )
            );
          }
        }
      }
    }
  }

  async deleteExpiredCollectionMessages() {
    const snapshot = await get(
      child(ref(this.database), `${DEPLOY_ID}/notifications/collections`)
    );
    if (!snapshot.exists()) return;
    const data: Database["collections"] = snapshot.val();
    for (const collectionId of Object.keys(data)) {
      for (const uuid of Object.keys(data[collectionId])) {
        const val: CollectionType = data[collectionId][uuid];
        if (new Date().getTime() > new Date(val.expireIn).getTime()) {
          await remove(
            ref(
              this.database,
              `${DEPLOY_ID}/notifications/collections/${collectionId}/${uuid}`
            )
          );
        }
      }
    }
  }

  async deleteExpiredInstanceMessages() {
    const snapshot = await get(
      child(ref(this.database), `${DEPLOY_ID}/notifications/instances`)
    );
    if (!snapshot.exists()) return;
    const data: Database["instances"] = snapshot.val();
    for (const collectionId of Object.keys(data)) {
      for (const instanceId of Object.keys(data[collectionId])) {
        for (const uuid of Object.keys(data[collectionId])) {
          const val: InstanceType = data[collectionId][instanceId][uuid];
          if (new Date().getTime() > new Date(val.expireIn).getTime()) {
            await remove(
              ref(
                this.database,
                `${DEPLOY_ID}/notifications/instances/${collectionId}/${instanceId}/${uuid}`
              )
            );
          }
        }
      }
    }
  }
}

export const db = new RealtimeDbManager();

setInterval(async () => {
  await db.deleteExpiredItemMessages();
}, DAY_IN_MS);

export type GenericMessageArg =
  | Parameters<typeof db.newItemMessages>[0]
  | Parameters<typeof db.newInstanceMessages>[0]
  | Parameters<typeof db.newCollectionMessages>[0];

export type ItemMessagesArg = Parameters<typeof db.newItemMessages>[0];
export type InstanceMessagesArg = Parameters<typeof db.newInstanceMessages>[0];
export type CollectionMessagesArg = Parameters<
  typeof db.newCollectionMessages
>[0];
