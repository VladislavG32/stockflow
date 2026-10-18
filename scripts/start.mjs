import "dotenv/config";
import { cpSync, existsSync } from "node:fs";
import { parseArgs } from "node:util";

// Standalone-сборка используется и локально, и в Docker. Статику Next.js нужно
// положить рядом с server.js; в Docker это делает COPY, здесь — cpSync.
const { values } = parseArgs({
  options: { port: { type: "string" }, hostname: { type: "string" } },
});
if (!existsSync(".next/standalone/server.js")) {
  throw new Error("Сначала выполните npm run build");
}
cpSync(".next/static", ".next/standalone/.next/static", { recursive: true });
process.env.PORT = values.port ?? process.env.APP_PORT ?? "3000";
process.env.HOSTNAME =
  values.hostname ?? process.env.APP_BIND_ADDRESS ?? "127.0.0.1";
await import("../.next/standalone/server.js");
