-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'LOGOUT';

-- CreateEnum
CREATE TYPE "LoginClientType" AS ENUM ('DESKTOP', 'WEB', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "LoginFailReason" AS ENUM ('INVALID_CREDENTIALS', 'USER_NOT_FOUND', 'USER_INACTIVE', 'LOCKED_OUT', 'VALIDATION_ERROR');

-- CreateTable
CREATE TABLE "login_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "username" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "failReason" "LoginFailReason",
    "ip" VARCHAR(64),
    "userAgent" VARCHAR(512),
    "clientType" "LoginClientType" NOT NULL DEFAULT 'UNKNOWN',
    "appVersion" VARCHAR(32),
    "sessionId" TEXT,
    "correlationId" VARCHAR(64),
    "timezone" VARCHAR(64),
    "locale" VARCHAR(32),
    "platform" VARCHAR(64),
    "screen" VARCHAR(32),
    "deviceFingerprint" VARCHAR(128),
    "country" VARCHAR(64),
    "city" VARCHAR(64),
    "isNewDevice" BOOLEAN NOT NULL DEFAULT false,
    "riskFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "activeSessionCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "loggedOutAt" TIMESTAMP(3),

    CONSTRAINT "login_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "login_events_sessionId_key" ON "login_events"("sessionId");

-- CreateIndex
CREATE INDEX "login_events_username_createdAt_idx" ON "login_events"("username", "createdAt");

-- CreateIndex
CREATE INDEX "login_events_userId_createdAt_idx" ON "login_events"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "login_events_success_createdAt_idx" ON "login_events"("success", "createdAt");

-- CreateIndex
CREATE INDEX "login_events_ip_createdAt_idx" ON "login_events"("ip", "createdAt");

-- CreateIndex
CREATE INDEX "login_events_deviceFingerprint_idx" ON "login_events"("deviceFingerprint");

-- AddForeignKey
ALTER TABLE "login_events" ADD CONSTRAINT "login_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
