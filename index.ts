import express from "express";
import http from "node:http";
import process from "node:process";

const PORT = process.env.PORT || 3000;
const app = express();

app.get("/", (req, res, next) => {
  res.json({ message: "/" });
});
const server = http.createServer(app);
server.listen(PORT, () => console.log(`Listening on ${PORT}`));

export default server;
