import { Router } from "websocket-express";
import {
  type Collection,
  type Instance,
  type Item,
  MessageManager,
  type Operation,
} from "./db.ts";
import type { Feature, Link } from "../utils/types.d.ts";
import type e from "express";
import process from "node:process";
const router = new Router({ caseSensitive: true, strict: true });
const mgr = new MessageManager();

router.ws("/collections", async (req, res) => {
  const [ws, cachedMessageIds] = [await res.accept(), Array<string>()];
  const { value } = await mgr.messagesByType<Collection>("collection");

  for (const message of value) {
    ws.send(JSON.stringify({
      ...message,
      links: [collectionLink(req, message.collectionId)],
    }));
    cachedMessageIds.push(message.id);
  }
  while (true) {
    const watcher = await mgr.watch<Collection>([["messages", "collection"]]);
    if (watcher.done) break;
    const { value } = watcher.value[0];
    for (const message of value) {
      if (cachedMessageIds.includes(message.id)) continue;
      ws.send(JSON.stringify({
        ...message,
        links: [collectionLink(req, message.collectionId)],
      }));
      cachedMessageIds.push(message.id);
    }
  }
});

router.ws("/collections/:collectionId", async (req, res) => {
  const [ws, cachedMessageIds] = [await res.accept(), Array<string>()];
  const { collectionId } = req.params;

  const { value } = await mgr.messagesByType<Collection>("collection");
  let messages = value.filter(filterByCollectionId(collectionId));
  for (const message of messages) {
    ws.send(
      JSON.stringify({
        ...message,
        links: [collectionLink(req, collectionId)],
      }),
    );
    cachedMessageIds.push(message.id);
  }

  while (true) {
    const watcher = await mgr.watch<Collection>([["messages", "collection"]]);
    if (watcher.done) break;
    const { value } = watcher.value[0];
    messages = value.filter(filterByCollectionId(collectionId));
    for (const message of messages) {
      if (cachedMessageIds.includes(message.id)) continue;
      ws.send(JSON.stringify({
        ...message,
        links: [collectionLink(req, collectionId)],
      }));
      cachedMessageIds.push(message.id);
    }
  }
});
router.ws("/collections/:collectionId/instances", async (req, res) => {
  const [ws, cachedMessageIds] = [await res.accept(), Array<string>()];
  const { collectionId } = req.params;
  const { value } = await mgr.messagesByType<Instance>("instance");
  let messages = value.filter(filterByCollectionId(collectionId));
  for (const message of messages) {
    ws.send(JSON.stringify({
      ...message,
      links: [collectionLink(req, collectionId, message.instanceId)],
    }));
    cachedMessageIds.push(message.id);
  }
  while (true) {
    const watcher = await mgr.watch<Instance>([["messages", "instance"]]);
    if (watcher.done) break;
    const { value } = watcher.value[0];
    messages = value.filter(filterByCollectionId(collectionId));
    for (const message of messages) {
      if (cachedMessageIds.includes(message.id)) continue;
      ws.send(
        JSON.stringify({
          ...message,
          links: [collectionLink(req, collectionId, message.instanceId)],
        }),
      );
      cachedMessageIds.push(message.id);
    }
  }
});
router.ws(
  "/collections/:collectionId/instances/:instanceId",
  async (req, res) => {
    const [ws, cachedMessageIds] = [await res.accept(), Array<string>()];
    const { value } = await mgr.messagesByType<Instance>("instance");
    const { collectionId, instanceId } = req.params;
    let messages = value
      .filter(filterByCollectionId(collectionId))
      .filter(filterByInstanceId(instanceId));
    for (const message of messages) {
      ws.send(
        JSON.stringify({
          ...message,
          links: [collectionLink(req, collectionId, instanceId)],
        }),
      );
      cachedMessageIds.push(message.id);
    }

    while (true) {
      const watcher = mgr.watch<Instance>([["messages", "instance"]]);
      if (!(await watcher).done) break;
      const { value } = (await watcher).value[0];
      messages = value
        .filter(filterByCollectionId(collectionId))
        .filter(filterByInstanceId(instanceId));
      for (const message of messages) {
        if (cachedMessageIds.includes(message.id)) continue;
        ws.send(JSON.stringify({
          ...message,
          links: [collectionLink(req, collectionId, instanceId)],
        }));
        cachedMessageIds.push(message.id);
      }
    }
  },
);
router.ws(
  "/collections/:collectionId/instances/:instanceId/items",
  async (req, res) => {
    const [ws, cachedMessageIds] = [await res.accept(), Array<string>()];
    const { instanceId, collectionId } = req.params;
    const { value } = await mgr.messagesByType<Item>("item");
    let messages = value
      .filter(filterByCollectionId(collectionId))
      .filter(filterByInstanceId(instanceId))
      .map(item2geojson());
    for (const message of messages) {
      ws.send(JSON.stringify({
        ...message,
        links: [
          itemLink(req, collectionId, message.properties.itemId, instanceId),
        ],
      }));
      cachedMessageIds.push(message.id);
    }

    while (true) {
      const watcher = await mgr.watch<Item>([["messages", "item"]]);
      if (watcher.done) break;
      const { value } = watcher.value[0];
      messages = value
        .filter(filterByCollectionId(collectionId))
        .filter(filterByInstanceId(instanceId))
        .map(item2geojson());
      for (const message of messages) {
        if (cachedMessageIds.includes(message.id)) continue;
        ws.send(JSON.stringify({
          ...message,
          links: [
            itemLink(req, collectionId, message.properties.itemId, instanceId),
          ],
        }));
        cachedMessageIds.push(message.id);
      }
    }
  },
);
router.ws("/collections/:collectionId/items", async (req, res) => {
  const [ws, cachedMessageIds] = [await res.accept(), Array<string>()];
  const { collectionId } = req.params;
  const { value } = await mgr.messagesByType<Item>("item");
  let messages = value
    .filter(filterByCollectionId(collectionId))
    .map(item2geojson());
  for (const message of messages) {
    ws.send(JSON.stringify({
      ...message,
      links: [itemLink(req, collectionId, message.properties.itemId)],
    }));
    cachedMessageIds.push(message.id);
  }

  while (true) {
    const watcher = await mgr.watch<Item>([["messages", "item"]]);
    if (watcher.done) break;
    const { value } = watcher.value[0];
    messages = value
      .filter(filterByCollectionId(collectionId))
      .map(item2geojson());
    for (const message of messages) {
      if (cachedMessageIds.includes(message.id)) continue;
      ws.send(
        JSON.stringify({
          ...message,
          links: [itemLink(req, collectionId, message.properties.itemId)],
        }),
      );
      cachedMessageIds.push(message.id);
    }
  }
});
router.ws("/collections/:collectionId/items/:itemId", async (req, res) => {
  const [ws, cachedMessageIds] = [await res.accept(), Array<string>()];
  const { collectionId, itemId } = req.params;

  const { value } = await mgr.messagesByType<Item>("item");
  let messages = value
    .filter(filterByCollectionId(collectionId))
    .filter(filterByItemId(itemId))
    .map(item2geojson());

  for (const message of messages) {
    ws.send(
      JSON.stringify({
        ...message,
        links: [itemLink(req, collectionId, itemId)],
      }),
    );
    cachedMessageIds.push(message.id);
  }

  while (true) {
    const watcher = await mgr.watch<Item>([["messages", "item"]]);
    if (watcher.done) break;
    const { value } = watcher.value[0];
    messages = value
      .filter(filterByCollectionId(collectionId))
      .filter(filterByItemId(itemId))
      .map(item2geojson());
    for (const message of messages) {
      if (cachedMessageIds.includes(message.id)) continue;
      ws.send(
        JSON.stringify({
          ...message,
          links: [itemLink(req, collectionId, itemId)],
        }),
      );
      cachedMessageIds.push(message.id);
    }
  }
});

router.ws(
  "/collections/:collectionId/instances/:instanceId/items/:itemId",
  async (req, res) => {
    const [ws, cachedMessageIds] = [await res.accept(), Array<string>()];
    const { collectionId, itemId, instanceId } = req.params;

    const { value } = await mgr.messagesByType<Item>("item");
    let messages = value
      .filter(filterByCollectionId(collectionId))
      .filter(filterByInstanceId(instanceId))
      .filter(filterByItemId(itemId))
      .map(item2geojson());

    for (const message of messages) {
      ws.send(
        JSON.stringify({
          ...message,
          links: [itemLink(req, collectionId, itemId, instanceId)],
        }),
      );
      cachedMessageIds.push(message.id);
    }

    while (true) {
      const watcher = await mgr.watch<Item>([["messages", "item"]]);
      if (watcher.done) break;
      const { value } = watcher.value[0];
      messages = value
        .filter(filterByCollectionId(collectionId))
        .filter(filterByItemId(itemId))
        .filter(filterByInstanceId(instanceId))
        .map(item2geojson());
      for (const message of messages) {
        if (cachedMessageIds.includes(message.id)) continue;
        ws.send(JSON.stringify({
          ...message,
          links: [itemLink(req, collectionId, itemId, instanceId)],
        }));
        cachedMessageIds.push(message.id);
      }
    }
  },
);

function filterByCollectionId(collectionId: string) {
  return (message: Collection | Item | Instance) => {
    return collectionId === message.collectionId;
  };
}
function filterByInstanceId(instanceId: string) {
  return (message: Item | Instance) => {
    if (!message.instanceId) return true;
    return message.instanceId === instanceId;
  };
}

function filterByItemId(itemId: string) {
  return (message: Item) => {
    return message.itemId === itemId;
  };
}

function item2geojson() {
  return (
    message: Item & { id: string; pubtime: string },
  ):
    & Feature<
      GeoJSON.Geometry,
      {
        pubtime: string;
        itemId: string;
        operation: Operation;
        [x: string]: any;
      }
    >
    & { id: string } => {
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
    };
  };
}
const root = (req: e.Request) =>
  (process.env.NODE_ENV === "production" ? "https://" : "http://") +
  req.headers.host;
function collectionLink(
  req: e.Request,
  collectionId: string,
  instanceId?: string,
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
  req: e.Request,
  collectionId: string,
  itemId: string,
  instanceId?: string,
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
