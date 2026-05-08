import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error(
      "[db] MONGODB_URI is not set. Add it to backend/.env before starting the server.\n" +
        "     Example: MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/sketch_ecommerce"
    );
    process.exit(1);
  }

  mongoose.set("strictQuery", true);

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    const { host, name } = mongoose.connection;
    console.log(`[db] connected to mongodb · ${host} · db=${name}`);
  } catch (err) {
    console.error("[db] failed to connect:", err.message);
    process.exit(1);
  }

  mongoose.connection.on("error", (err) => {
    console.error("[db] error:", err.message);
  });
  mongoose.connection.on("disconnected", () => {
    console.warn("[db] disconnected");
  });
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
