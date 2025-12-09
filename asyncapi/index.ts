import { Router } from "websocket-express";
import {
  db,
  Database,
  CollectionType,
  InstanceType,
  ItemType,
  DEPLOY_ID,
} from "./firebase.ts";
import type { Feature, Link } from "../utils/types.d.ts";
import type { Request } from "express";
import process from "node:process";
import { onValue, ref } from "firebase/database";
const router = new Router({ caseSensitive: true, strict: true });

// Isolate each kv pair

router.ws("/collections", async (req, res) => {
  const [ws, cachedMessageIds] = [await res.accept(), Array<string>()];

  const unsubscribe = onValue(
    ref(db.database, `${DEPLOY_ID}/notifications/collections`),
    (snapshot) => {
      if (ws.readyState !== ws.OPEN) return;
      const data: Database["collections"] = snapshot.val() || {};
      const messages = Object.values(data).flatMap((e) => Object.values(e));
      for (const message of messages) {
        if (cachedMessageIds.includes(message.id)) continue;
        ws.send(JSON.stringify(collection2message(req, message)));
        cachedMessageIds.push(message.id);
      }
    }
  );
  ws.on("close", () => {
    unsubscribe();
  });
});

router.ws("/collections/:collectionId", async (req, res) => {
  const [ws, cachedMessageIds] = [await res.accept(), Array<string>()];
  const { collectionId } = req.params;
  const unsubscribe = onValue(
    ref(db.database, `${DEPLOY_ID}/notifications/collections/${collectionId}`),
    (snapshot) => {
      if (ws.readyState !== ws.OPEN) return;
      const data: Database["collections"][string] = snapshot.val() || {};
      // Flatten the Structure
      const messages = Object.values(data);

      for (const message of messages) {
        if (cachedMessageIds.includes(message.id)) continue;
        ws.send(JSON.stringify(collection2message(req, message)));
        cachedMessageIds.push(message.id);
      }
    }
  );
  ws.on("close", () => unsubscribe());
});
router.ws("/collections/:collectionId/instances", async (req, res) => {
  const [ws, cachedMessageIds] = [await res.accept(), Array<string>()];
  const { collectionId } = req.params;
  const unsubscribe = onValue(
    ref(db.database, `${DEPLOY_ID}/notifications/instances/${collectionId}`),
    (snapshot) => {
      if (ws.readyState !== ws.OPEN) return;
      const data: Database["instances"][string] = snapshot.val() || {};
      // Flatten the Structure
      const messages = Object.values(data).flatMap((e) => Object.values(e));

      for (const message of messages) {
        if (cachedMessageIds.includes(message.id)) continue;
        ws.send(JSON.stringify(instance2message(req, message)));
        cachedMessageIds.push(message.id);
      }
    }
  );

  ws.on("close", () => unsubscribe());
});
router.ws(
  "/collections/:collectionId/instances/:instanceId",
  async (req, res) => {
    const { instanceId, collectionId } = req.params;
    const [ws, cachedMessageIds] = [await res.accept(), Array<string>()];
    const unsubscribe = onValue(
      ref(
        db.database,
        `${DEPLOY_ID}/notifications/instances/${collectionId}/${instanceId}`
      ),
      (snapshot) => {
        if (ws.readyState !== ws.OPEN) return;
        const data: Database["instances"][string][string] =
          snapshot.val() || {};
        // Flatten the Structure
        const messages = Object.values(data);
        for (const message of messages) {
          if (cachedMessageIds.includes(message.id)) continue;
          ws.send(JSON.stringify(instance2message(req, message)));
          cachedMessageIds.push(message.id);
        }
      }
    );
    ws.on("close", () => unsubscribe());
  }
);
router.ws(
  "/collections/:collectionId/instances/:instanceId/items",
  async (req, res) => {
    const [ws, cachedMessageIds] = [await res.accept(), Array<string>()];
    const { collectionId, instanceId } = req.params;

    const unsubscribe = onValue(
      ref(db.database, `${DEPLOY_ID}/notifications/items/${collectionId}`),
      (snapshot) => {
        if (ws.readyState !== ws.OPEN) return;
        const data: Database["items"][string] = snapshot.val() || {};
        // Flatten the Structure
        const messages = Object.values(data)
          .flatMap((e) => Object.values(e))
          .filter((e) => e.instanceId === instanceId);

        for (const message of messages) {
          if (cachedMessageIds.includes(message.id)) continue;
          ws.send(JSON.stringify(item2geojson(req)(message)));
          cachedMessageIds.push(message.id);
        }
      }
    );

    ws.on("close", () => unsubscribe());
  }
);
router.ws("/collections/:collectionId/items", async (req, res) => {
  const { collectionId } = req.params;
  const [ws, cachedMessageIds] = [await res.accept(), Array<string>()];

  const unsubscribe = onValue(
    ref(db.database, `${DEPLOY_ID}/items/${collectionId}`),
    (snapshot) => {
      if (ws.readyState !== ws.OPEN) return;
      const data: Database["items"][string] = snapshot.val() || {};
      // Flatten the Structure
      const messages = Object.values(data).flatMap((e) => Object.values(e));

      for (const message of messages) {
        if (cachedMessageIds.includes(message.id)) continue;
        ws.send(JSON.stringify(item2geojson(req)(message)));
        cachedMessageIds.push(message.id);
      }
    }
  );
  ws.on("close", () => unsubscribe());
});

router.ws("/collections/:collectionId/items/:itemId", async (req, res) => {
  const [ws, cachedMessageIds] = [await res.accept(), Array<string>()];
  const { collectionId, itemId } = req.params;

  const unsubscribe = onValue(
    ref(
      db.database,
      `${DEPLOY_ID}/notifications/items/${collectionId}/${itemId}`
    ),
    (snapshot) => {
      if (ws.readyState !== ws.OPEN) return;
      const data: Database["items"][string][string] = snapshot.val() || {};
      // Flatten the Structure
      const messages = Object.values(data);

      for (const message of messages) {
        if (cachedMessageIds.includes(message.id)) continue;
        ws.send(JSON.stringify(item2geojson(req)(message)));
        cachedMessageIds.push(message.id);
      }
    }
  );
  ws.on("close", () => unsubscribe());
});

router.ws(
  "/collections/:collectionId/instances/:instanceId/items/:itemId",
  async (req, res) => {
    const [ws, cachedMessageIds] = [await res.accept(), Array<string>()];
    const { collectionId, instanceId, itemId } = req.params;

    const unsubscribe = onValue(
      ref(
        db.database,
        `${DEPLOY_ID}/notifications/items/${collectionId}/${itemId}`
      ),
      (snapshot) => {
        if (ws.readyState !== ws.OPEN) return;
        const data: Database["items"][string][string] = snapshot.val() || {};
        // Flatten the Structure
        const messages = Object.values(data).filter(
          (e) => e.instanceId === instanceId
        );

        for (const message of messages) {
          if (cachedMessageIds.includes(message.id)) continue;
          ws.send(JSON.stringify(item2geojson(req)(message)));
          cachedMessageIds.push(message.id);
        }
      }
    );

    ws.on("close", () => unsubscribe());
  }
);

function collection2message(req: Request, message: CollectionType) {
  return { ...message, links: [collectionLink(req, message.collectionId)] };
}
function instance2message(req: Request, message: InstanceType) {
  return {
    ...message,
    links: [collectionLink(req, message.collectionId, message.instanceId)],
  };
}
function item2geojson(req: Request) {
  return (
    message: ItemType & { id: string; pubtime: string }
  ): Feature<
    GeoJSON.Geometry,
    Omit<ItemType, "geometry" | "id" | "collectionId">
  > & {
    id: string;
  } => {
    delete message.collectionId;
    delete message.expireIn;
    const { geometry, id, ...properties } = message;
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
