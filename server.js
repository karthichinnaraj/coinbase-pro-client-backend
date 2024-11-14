// server.js
const express = require("express");
const WebSocket = require("ws");
const cors = require("cors");
const http = require("http");

const app = express();
app.use(cors());
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const coinbaseWS = new WebSocket("wss://ws-feed.pro.coinbase.com");

coinbaseWS.on("error", (error) => {
  console.error("Coinbase WebSocket error:", error);
});

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    const msg = JSON.parse(message);
    handleClientMessage(ws, msg);
  });

  ws.on("close", () => {
    removeClient(ws);
  });

  ws.on("error", (error) => {
    console.error("Client WebSocket error:", error);
  });
});

function handleClientMessage(ws, msg) {
  if (msg.type === "subscribe") {
    subscribeClient(ws, msg.product_id);
  } else if (msg.type === "unsubscribe") {
    unsubscribeClient(ws, msg.product_id);
  }
}

function subscribeClient(ws, productId) {
  if (!clients[ws]) {
    clients[ws] = { products: new Set() };
  }
  clients[ws].products.add(productId);

  coinbaseWS.send(
    JSON.stringify({
      type: "subscribe",
      channels: [{ name: "level2", product_ids: [productId] }, { name: "matches", product_ids: [productId] }],
    })
  );
}


function unsubscribeClient(ws, productId) {
  if (clients[ws]) {
    clients[ws].products.delete(productId);

    coinbaseWS.send(
      JSON.stringify({
        type: "unsubscribe",
        channels: [{ name: "level2", product_ids: [productId] }, { name: "matches", product_ids: [productId] }],
      })
    );
  }
}


function removeClient(ws) {
  delete clients[ws];
}

coinbaseWS.on("message", (data) => {
  const message = JSON.parse(data);
  Object.keys(clients).forEach((client) => {
    if (clients[client].products.has(message.product_id)) {
      client.send(data);
    }
  });
});

// Start the server
server.listen(5001, () => console.log("Server started on port 5001"));
