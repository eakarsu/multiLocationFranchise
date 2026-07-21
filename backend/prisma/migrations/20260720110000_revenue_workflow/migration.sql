-- CreateEnum
CREATE TYPE "LeadLifecycleStatus" AS ENUM ('NEW', 'QUALIFIED', 'DISQUALIFIED', 'PENDING_APPROVAL', 'APPROVED', 'CONTACTED', 'NURTURING', 'HANDED_OFF', 'CONVERTED', 'LOST', 'SUPPRESSED');

-- CreateEnum
CREATE TYPE "AccountLifecycleStatus" AS ENUM ('PROSPECT', 'ACTIVE', 'INACTIVE', 'CHURNED');

-- CreateEnum
CREATE TYPE "OwnershipStatus" AS ENUM ('UNASSIGNED', 'ASSIGNED', 'ACCEPTED', 'REASSIGN_REQUESTED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "HandoffStatus" AS ENUM ('NOT_READY', 'READY', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('UNKNOWN', 'OPTED_IN', 'OPTED_OUT');

-- CreateEnum
CREATE TYPE "OutreachChannel" AS ENUM ('EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "OutreachStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'QUEUED', 'SENT', 'DELIVERED', 'BOUNCED', 'COMPLAINED', 'CANCELLED', 'SUPPRESSED');

-- CreateEnum
CREATE TYPE "SuppressionReason" AS ENUM ('OPT_OUT', 'HARD_BOUNCE', 'COMPLAINT', 'LEGAL', 'MANUAL');

-- CreateEnum
CREATE TYPE "SyncDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'DEAD_LETTER');

-- CreateEnum
CREATE TYPE "WebhookProcessingStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'IGNORED', 'FAILED');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "externalCrmId" TEXT,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "countryCode" TEXT NOT NULL DEFAULT 'US',
    "region" TEXT,
    "status" "AccountLifecycleStatus" NOT NULL DEFAULT 'PROSPECT',
    "ownerId" TEXT,
    "attributionSource" TEXT,
    "attributionCampaign" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "externalCrmId" TEXT,
    "accountId" TEXT,
    "locationId" TEXT,
    "ownerId" TEXT,
    "email" TEXT,
    "normalizedEmail" TEXT,
    "phone" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "companyName" TEXT,
    "countryCode" TEXT NOT NULL DEFAULT 'US',
    "region" TEXT,
    "source" TEXT NOT NULL,
    "attributionSource" TEXT,
    "attributionCampaign" TEXT,
    "status" "LeadLifecycleStatus" NOT NULL DEFAULT 'NEW',
    "ownershipStatus" "OwnershipStatus" NOT NULL DEFAULT 'UNASSIGNED',
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "handoffStatus" "HandoffStatus" NOT NULL DEFAULT 'NOT_READY',
    "qualityScore" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "lastContactedAt" TIMESTAMP(3),
    "convertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadTransition" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "fromStatus" "LeadLifecycleStatus",
    "toStatus" "LeadLifecycleStatus" NOT NULL,
    "actorId" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadTransition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactPolicy" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "channel" "OutreachChannel" NOT NULL,
    "consentStatus" "ConsentStatus" NOT NULL DEFAULT 'UNKNOWN',
    "legalBasis" TEXT,
    "region" TEXT,
    "doNotContact" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentEvent" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "channel" "OutreachChannel" NOT NULL,
    "status" "ConsentStatus" NOT NULL,
    "source" TEXT NOT NULL,
    "legalBasis" TEXT,
    "evidence" JSONB,
    "recordedById" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuppressionEntry" (
    "id" TEXT NOT NULL,
    "channel" "OutreachChannel" NOT NULL,
    "normalizedValue" TEXT NOT NULL,
    "reason" "SuppressionReason" NOT NULL,
    "source" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuppressionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outreach" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "channel" "OutreachChannel" NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" "OutreachStatus" NOT NULL DEFAULT 'DRAFT',
    "idempotencyKey" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "requiresReview" BOOLEAN NOT NULL DEFAULT true,
    "policySnapshot" JSONB NOT NULL,
    "providerMessageId" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Outreach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "direction" "SyncDirection" NOT NULL,
    "resourceType" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncCursor" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "cursor" TEXT,
    "syncedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncCursor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrichmentRecord" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "qualityScore" INTEGER,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnrichmentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttributionTouch" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "campaign" TEXT,
    "medium" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttributionTouch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevenueOutbox" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevenueOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderWebhook" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "WebhookProcessingStatus" NOT NULL DEFAULT 'RECEIVED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_dedupeKey_key" ON "Account"("dedupeKey");

-- CreateIndex
CREATE UNIQUE INDEX "Account_externalCrmId_key" ON "Account"("externalCrmId");

-- CreateIndex
CREATE INDEX "Account_ownerId_status_idx" ON "Account"("ownerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_dedupeKey_key" ON "Lead"("dedupeKey");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_externalCrmId_key" ON "Lead"("externalCrmId");

-- CreateIndex
CREATE INDEX "Lead_status_ownerId_idx" ON "Lead"("status", "ownerId");

-- CreateIndex
CREATE INDEX "Lead_locationId_status_idx" ON "Lead"("locationId", "status");

-- CreateIndex
CREATE INDEX "Lead_normalizedEmail_idx" ON "Lead"("normalizedEmail");

-- CreateIndex
CREATE INDEX "LeadTransition_leadId_createdAt_idx" ON "LeadTransition"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "ContactPolicy_channel_consentStatus_doNotContact_idx" ON "ContactPolicy"("channel", "consentStatus", "doNotContact");

-- CreateIndex
CREATE UNIQUE INDEX "ContactPolicy_leadId_channel_key" ON "ContactPolicy"("leadId", "channel");

-- CreateIndex
CREATE INDEX "ConsentEvent_leadId_channel_occurredAt_idx" ON "ConsentEvent"("leadId", "channel", "occurredAt");

-- CreateIndex
CREATE INDEX "SuppressionEntry_active_expiresAt_idx" ON "SuppressionEntry"("active", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "SuppressionEntry_channel_normalizedValue_key" ON "SuppressionEntry"("channel", "normalizedValue");

-- CreateIndex
CREATE UNIQUE INDEX "Outreach_idempotencyKey_key" ON "Outreach"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Outreach_providerMessageId_key" ON "Outreach"("providerMessageId");

-- CreateIndex
CREATE INDEX "Outreach_status_scheduledAt_idx" ON "Outreach"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "Outreach_leadId_createdAt_idx" ON "Outreach"("leadId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SyncEvent_idempotencyKey_key" ON "SyncEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "SyncEvent_status_createdAt_idx" ON "SyncEvent"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SyncEvent_provider_direction_resourceType_externalId_key" ON "SyncEvent"("provider", "direction", "resourceType", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "SyncCursor_provider_resourceType_key" ON "SyncCursor"("provider", "resourceType");

-- CreateIndex
CREATE INDEX "EnrichmentRecord_leadId_createdAt_idx" ON "EnrichmentRecord"("leadId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EnrichmentRecord_provider_externalId_key" ON "EnrichmentRecord"("provider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "AttributionTouch_dedupeKey_key" ON "AttributionTouch"("dedupeKey");

-- CreateIndex
CREATE INDEX "AttributionTouch_leadId_occurredAt_idx" ON "AttributionTouch"("leadId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "RevenueOutbox_idempotencyKey_key" ON "RevenueOutbox"("idempotencyKey");

-- CreateIndex
CREATE INDEX "RevenueOutbox_status_availableAt_idx" ON "RevenueOutbox"("status", "availableAt");

-- CreateIndex
CREATE INDEX "ProviderWebhook_status_createdAt_idx" ON "ProviderWebhook"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderWebhook_provider_externalEventId_key" ON "ProviderWebhook"("provider", "externalEventId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadTransition" ADD CONSTRAINT "LeadTransition_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadTransition" ADD CONSTRAINT "LeadTransition_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactPolicy" ADD CONSTRAINT "ContactPolicy_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentEvent" ADD CONSTRAINT "ConsentEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentEvent" ADD CONSTRAINT "ConsentEvent_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outreach" ADD CONSTRAINT "Outreach_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outreach" ADD CONSTRAINT "Outreach_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outreach" ADD CONSTRAINT "Outreach_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrichmentRecord" ADD CONSTRAINT "EnrichmentRecord_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributionTouch" ADD CONSTRAINT "AttributionTouch_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing reset tokens were historically stored in plaintext. They cannot be
-- distinguished from new SHA-256 digests, so invalidate them during upgrade.
UPDATE "User" SET "passwordResetToken" = NULL, "passwordResetExpires" = NULL
WHERE "passwordResetToken" IS NOT NULL OR "passwordResetExpires" IS NOT NULL;

-- Domain invariants that should remain true even for non-application writers.
ALTER TABLE "Account" ADD CONSTRAINT "Account_version_positive" CHECK ("version" >= 1);
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_version_positive" CHECK ("version" >= 1);
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_quality_score_range" CHECK ("qualityScore" IS NULL OR ("qualityScore" >= 0 AND "qualityScore" <= 100));
ALTER TABLE "Outreach" ADD CONSTRAINT "Outreach_attempts_nonnegative" CHECK ("attempts" >= 0);
ALTER TABLE "SyncEvent" ADD CONSTRAINT "SyncEvent_attempts_nonnegative" CHECK ("attempts" >= 0);
ALTER TABLE "RevenueOutbox" ADD CONSTRAINT "RevenueOutbox_attempts_nonnegative" CHECK ("attempts" >= 0);
ALTER TABLE "ProviderWebhook" ADD CONSTRAINT "ProviderWebhook_attempts_nonnegative" CHECK ("attempts" >= 0);
ALTER TABLE "EnrichmentRecord" ADD CONSTRAINT "EnrichmentRecord_quality_score_range" CHECK ("qualityScore" IS NULL OR ("qualityScore" >= 0 AND "qualityScore" <= 100));

