// index.js
const express = require("express");
const http = require("http");
const app = express();
const PORT = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

let isShuttingDown = false;
let activeRequests = 0;

// Middleware to track active requests
app.use((req, res, next) => {
  if (isShuttingDown) {
    // Tell client not to keep connection alive during shutdown
    res.setHeader("Connection", "close");
  }

  activeRequests++;
  console.log("Request started, active:", activeRequests);

  res.on("finish", () => {
    activeRequests--;
    console.log("Request ended, active:", activeRequests);

    // If shutting down and no active requests left, exit
    if (isShuttingDown && activeRequests === 0) {
      console.log("All requests finished. Exiting now.");
      process.exit(0);
    }
  });

  next();
});

// Simple GET endpoint
app.get("/api/1s", async (req, res) => {
  //   console.log("GET Request starts: " + process.pid);
  await sleep(5_000);
  //   console.log("GET Request end: " + process.pid);
  res.json({ message: "from my-app 1s v2 pid: " + process.pid });
});

// // Start server
// app.listen(PORT, () => {
//   console.log(`Server is running at http://localhost:${PORT}`);
// });

// Create a server instance so we can control it later
const server = http.createServer(app);

// Start server
server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  if (process.send) {
    console.log("sending ready");
    process.send("ready");
  }
});

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Graceful shutdown logic
function gracefulShutdown() {
  if (isShuttingDown) return; // avoid multiple calls
  console.log("\nGracefully shutting down...");
  isShuttingDown = true;

  // Stop accepting new connections
  server.close((err) => {
    if (err) {
      console.error("Error closing server:", err);
      process.exit(1);
    }
    console.log("Stopped accepting new connections.");
    // Exit only if no active requests
    if (activeRequests === 0) {
      console.log("No active requests, exiting now.");
      process.exit(0);
    } else {
      console.log(
        `Waiting for ${activeRequests} active request(s) to finish...`
      );
    }
  });

  // Force exit after 15 seconds even if requests hang
  setTimeout(() => {
    console.error("Forcefully exiting due to timeout.");
    process.exit(1);
  }, 15000);
}

// Handle kill signals
process.on("SIGINT", gracefulShutdown); // Ctrl+C
process.on("SIGTERM", gracefulShutdown); // Docker/PM2 etc.
