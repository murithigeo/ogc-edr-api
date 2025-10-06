import { Router } from "websocket-express";

const router = new Router({ caseSensitive: true, strict: true });

router.ws("/collections", async (req, res, next) => {
  const ws = await res.accept();
});
router.ws("/collections/:collectionId", (req, res, next) => {});
router.ws("/collections/:collectionId/instances", (req, res, next) => {});
router.ws(
  "/collections/:collectionId/instances/:instanceId",
  (req, res, next) => {}
);

export default router;
