import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ZodExceptionFilter } from "./common/zod-exception.filter";
import { corsOptions } from "./cors.config";

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
