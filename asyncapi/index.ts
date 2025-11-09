import { Router } from "websocket-express";
import db, {
  type Metadata,
  type Collection,
  type Instance,
  type Item,
  type Operation,
} from "./db.ts";
import type { Feature, Link } from "../utils/types.d.ts";
import type { Request } from "express";
import process from "node:process";
const router = new Router({ caseSensitive: true, strict: true });

router.ws("/collections", async (req, res) => {
  const [ws, cachedMessageIds] = [await res.accept(), Array<string>()];
  const messages = await Array.fromAsync(
    db.db.list<Collection & Metadata>({ prefix: ["messages", "collection"] })
  );
  for (const { value: message } of messages) {
    ws.send(
      JSON.stringify({
        ...message,
        links: [collectionLink(req, message.collectionId)],
      })
    );
    cachedMessageIds.push(message.id);
  }
  while (true) {
    const watcher = await db.db
      .watch<(Collection & Metadata)[]>([["notifications", "collection"]])
      .getReader()
      .read();

    if (watcher.done) break;

    for (const { value: message } of watcher.value) {
      if (!message) continue;
      if (cachedMessageIds.includes(message.id)) continue;
      ws.send(JSON.stringify(message));
      cachedMessageIds.push(message.id);
    }
  }
});

router.ws("/collections/:collectionId", async (req, res) => {
  const [ws, cachedMessageIds, collectionId] = [
    await res.accept(),
    Array<string>(),
    req.params.id,
  ];
  const messages = await Array.fromAsync(
    db.db.list<Collection & Metadata>({
      prefix: ["notifications", "collection", collectionId],
    })
  );
  for (const { value: message } of messages) {
    ws.send(
      JSON.stringify({
        ...message,
        links: [collectionLink(req, message.collectionId)],
      })
    );
    cachedMessageIds.push(message.id);
  }
  while (true) {
    const watcher = await db.db
      .watch<(Collection & Metadata)[]>([
        ["notifications", "collection", collectionId],
      ])
      .getReader()
      .read();

    if (watcher.done) break;

    for (const { value: message } of watcher.value) {
      if (!message) continue;
      if (cachedMessageIds.includes(message.id)) continue;
      ws.send(
        JSON.stringify({
          ...message,
          links: [collectionLink(req, collectionId)],
        })
      );
      cachedMessageIds.push(message.id);
    }
  }
});
router.ws("/collections/:collectionId/instances", async (req, res) => {
  const [ws, cachedMessageIds, collectionId] = [
    await res.accept(),
    Array<string>(),
    req.params.id,
  ];
  const messages = await Array.fromAsync(
    db.db.list<Instance & Metadata>({
      prefix: ["notifications", "instance", collectionId],
    })
  );
  for (const { value: message } of messages) {
    ws.send(
      JSON.stringify({
        ...message,
        links: [collectionLink(req, message.collectionId, message.instanceId)],
      })
    );
    cachedMessageIds.push(message.id);
  }
  while (true) {
    const watcher = await db.db
      .watch<(Instance & Metadata)[]>([
        ["notifications", "instance", collectionId],
      ])
      .getReader()
      .read();

    if (watcher.done) break;

    for (const { value: message } of watcher.value) {
      if (!message) continue;
      if (cachedMessageIds.includes(message.id)) continue;
      ws.send(
        JSON.stringify({
          ...message,
          links: [collectionLink(req, collectionId, message.instanceId)],
        })
      );
      cachedMessageIds.push(message.id);
    }
  }
});
router.ws(
  "/collections/:collectionId/instances/:instanceId",
  async (req, res) => {
    const { instanceId, collectionId } = req.params;
    const [ws, cachedMessageIds] = [await res.accept(), Array<string>()];
    const messages = await Array.fromAsync(
      db.db.list<Collection & Metadata>({
        prefix: ["notifications", "instance", collectionId, instanceId],
      })
    );
    for (const { value: message } of messages) {
      ws.send(
        JSON.stringify({
          ...message,
          links: [collectionLink(req, message.collectionId, instanceId)],
        })
      );
      cachedMessageIds.push(message.id);
    }
    while (true) {
      const watcher = await db.db
        .watch<(Collection & Metadata)[]>([
          ["notifications", "instance", collectionId],
        ])
        .getReader()
        .read();

      if (watcher.done) break;

      for (const { value: message } of watcher.value) {
        if (!message) continue;
        if (cachedMessageIds.includes(message.id)) continue;
        ws.send(
          JSON.stringify({
            ...message,
            links: [collectionLink(req, collectionId, instanceId)],
          })
        );
        cachedMessageIds.push(message.id);
      }
    }
  }
);
router.ws(
  "/collections/:collectionId/instances/:instanceId/items",
  async (req, res) => {
    const { collectionId, instanceId } = req.params;
    const [ws, cachedMessageIds] = [await res.accept(), Array<string>()];
    const messages = await Array.fromAsync(
      db.db.list<Item & Metadata>({
        prefix: ["notifications", "item", collectionId, instanceId],
      })
    );
    for (const { value: message } of messages) {
      ws.send(JSON.stringify(item2geojson(req)(message)));
      cachedMessageIds.push(message.id);
    }
    while (true) {
      const watcher = await db.db
        .watch<(Item & Metadata)[]>([
          ["notifications", "item", collectionId, instanceId],
        ])
        .getReader()
        .read();

      if (watcher.done) break;

      for (const { value: message } of watcher.value) {
        if (!message) continue;
        if (cachedMessageIds.includes(message.id)) continue;
        ws.send(JSON.stringify(item2geojson(req)(message)));
        cachedMessageIds.push(message.id);
      }
    }
  }
);
router.ws("/collections/:collectionId/items", async (req, res) => {
  const { collectionId } = req.params;
  const [ws, cachedMessageIds] = [await res.accept(), Array<string>()];
  const messages = await Array.fromAsync(
    db.db.list<Item & Metadata>({
      prefix: ["notifications", "item", collectionId],
    })
  );
  for (const { value: message } of messages) {
    ws.send(JSON.stringify(item2geojson(req)(message)));
    cachedMessageIds.push(message.id);
  }
  while (true) {
    const watcher = await db.db
      .watch<(Item & Metadata)[]>([["notifications", "item", collectionId]])
      .getReader()
      .read();

    if (watcher.done) break;

    for (const { value: message } of watcher.value) {
      if (!message) continue;
      if (cachedMessageIds.includes(message.id)) continue;
      ws.send(JSON.stringify(item2geojson(req)(message)));
      cachedMessageIds.push(message.id);
    }
  }
});

router.ws("/collections/:collectionId/items/:itemId", async (req, res) => {
  const { collectionId, itemId } = req.params;
  const [ws, cachedMessageIds] = [await res.accept(), Array<string>()];
  const messages = await Array.fromAsync(
    db.db.list<Item & Metadata>({
      prefix: ["notifications", "item", collectionId, itemId],
    })
  );
  for (const { value: message } of messages) {
    ws.send(JSON.stringify(item2geojson(req)(message)));
    cachedMessageIds.push(message.id);
  }
  while (true) {
    const watcher = await db.db
      .watch<(Item & Metadata)[]>([
        ["notifications", "item", collectionId, itemId],
      ])
      .getReader()
      .read();

    if (watcher.done) break;

    for (const { value: message } of watcher.value) {
      if (!message) continue;
      if (cachedMessageIds.includes(message.id)) continue;
      ws.send(JSON.stringify(item2geojson(req)(message)));
      cachedMessageIds.push(message.id);
    }
  }
});

router.ws(
  "/collections/:collectionId/instances/:instanceId/items/:itemId",
  async (req, res) => {
    const { collectionId, itemId, instanceId } = req.params;
    const [ws, cachedMessageIds] = [await res.accept(), Array<string>()];
    const messages = (
      await Array.fromAsync(
        db.db.list<Item & Metadata>({
          prefix: ["notifications", "item", collectionId, instanceId, itemId],
        })
      )
    ).map((e) => e.value);
    for (const message of messages) {
      ws.send(JSON.stringify(item2geojson(req)(message)));
      cachedMessageIds.push(message.id);
    }
    while (true) {
      const watcher = await db.db
        .watch<(Item & Metadata)[]>([
          ["notifications", "item", collectionId, instanceId, itemId],
        ])
        .getReader()
        .read();

      if (watcher.done) break;

      for (const { value: message } of watcher.value) {
        if (!message) continue;
        if (cachedMessageIds.includes(message.id)) continue;
        ws.send(JSON.stringify(item2geojson(req)(message)));
        cachedMessageIds.push(message.id);
      }
    }
  }
);

// function filterByCollectionId(collectionId: string) {
//   return (message: Collection | Item | Instance) => {
//     return collectionId === message.collectionId;
//   };
// }
// function filterByInstanceId(instanceId: string) {
//   return (message: Item | Instance) => {
//     if (!message.instanceId) return true;
//     return message.instanceId === instanceId;
//   };
// }

// function filterByItemId(itemId: string) {
//   return (message: Item) => {
//     return message.itemId === itemId;
//   };
// }

function item2geojson(req: Request) {
  return (
    message: Item & { id: string; pubtime: string }
  ): Feature<
    GeoJSON.Geometry,
    {
      pubtime: string;
      itemId: string;
      operation: Operation;
      [x: string]: any;
    }
  > & { id: string } => {
    const {
      type: _,
      collectionId: __,
      instanceId: ___,
      geometry,
      id,
      ...properties
    } = message;
    return {
      type: "Feature",
      geometry,
      id,
      properties,
      links: [itemLink(req, message.collectionId, message.itemId)],
    };
  };
}
const root = (req: Request) =>
  (process.env.NODE_ENV === "production" ? "https://" : "http://") +
  req.headers.host;
function collectionLink(
  req: Request,
  collectionId: string,
  instanceId?: string
): Link {
  let channel = `/collections/${collectionId}`;
  if (instanceId) channel += `/instances/${instanceId}`;
  return {
    title: "View Collection Metadata",
    href: root(req) + channel,
    type: "application/json",
    rel: "collection",
  };
}
function itemLink(
  req: Request,
  collectionId: string,
  itemId: string,
  instanceId?: string
): Link {
  let channel = `/collections/${collectionId}`;
  if (instanceId) channel += `/instances/${instanceId}`;
  channel += `/items/${itemId}`;
  return {
    title: "View Item",
    href: root(req) + channel,
    rel: "item",
    type: "application/geo+json",
  };
}
export default router;
