import mongoose from "mongoose";

// Cache the connect() promise on the module scope so warm serverless
// invocations (e.g. on Vercel) reuse the same connection. On Node's hot
// reload this also prevents duplicate connections.
let cachedPromise = null;

export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    // Already connected — nothing to do.
    return mongoose.connection;
  }
  if (cachedPromise) {
    return cachedPromise;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    const err = new Error(
      "MONGODB_URI is not set. Add it to backend/.env (locally) or your Vercel project's environment variables."
    );
    err.status = 500;
    throw err;
  }

  mongoose.set("strictQuery", true);

  cachedPromise = mongoose
    .connect(uri, {
      // Keep cold-start failures snappy.
      serverSelectionTimeoutMS: 10000,
    })
    .then((m) => {
      const { host, name } = m.connection;
      console.log(`[db] connected to mongodb · ${host} · db=${name}`);
      return m.connection;
    })
    .catch((err) => {
      // Reset so the next request retries instead of blocking forever on
      // a rejected promise.
      cachedPromise = null;
      console.error("[db] failed to connect:", err.message);
      throw err;
    });

  mongoose.connection.on("error", (err) => {
    console.error("[db] error:", err.message);
  });
  mongoose.connection.on("disconnected", () => {
    console.warn("[db] disconnected");
    // Allow reconnect attempts on next request.
    cachedPromise = null;
  });

  return cachedPromise;
}

export async function disconnectDB() {
  cachedPromise = null;
  await mongoose.disconnect();
}
