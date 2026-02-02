import "dotenv/config";
import { buildServer } from "./server";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

const app = buildServer();

app
  .listen({ port, host })
  .then(() => {
    console.log(`Server listening on http://${host}:${port}`);
  })
  .catch((error) => {
    console.error("Failed to start server", error);
    process.exit(1);
  });
