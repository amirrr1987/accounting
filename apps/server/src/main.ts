import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ZodExceptionFilter } from "./common/zod-exception.filter";
import { corsOptions } from "./cors.config";

function loadEnvFile(): void {
  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(__dirname, "..", ".env"),
  ];
  for (const envPath of candidates) {
    if (!existsSync(envPath)) continue;
    // Node 20.12+ / 22 — loads KEY=VALUE into process.env without overriding existing values
    process.loadEnvFile(envPath);
    return;
  }
}

loadEnvFile();

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is not set. Copy apps/server/.env.example to apps/server/.env and retry.",
  );
  process.exit(1);
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new ZodExceptionFilter());
  app.enableCors(corsOptions);
  const port = Number(process.env.PORT ?? 3100);
  try {
    await app.listen(port);
  } catch (err: unknown) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code?: string }).code)
        : "";
    if (code === "EADDRINUSE") {
      console.error(
        `Port ${port} is already in use. Stop the other Nest process (or turbo/npm run dev duplicate) and retry.`,
      );
      process.exit(1);
    }
    throw err;
  }
}

void bootstrap();
