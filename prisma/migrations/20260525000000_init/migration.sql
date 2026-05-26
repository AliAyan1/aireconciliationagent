-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'REVIEWED', 'POSTED', 'EXPORTED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('AUTO_MATCHED', 'REVIEW', 'APPROVED', 'REJECTED', 'UNMATCHED', 'POSTED');

-- CreateEnum
CREATE TYPE "MatchType" AS ENUM ('EXACT', 'NEAR', 'FUZZY', 'AI_SCORED', 'GENERATED', 'UNMATCHED');

-- CreateEnum
CREATE TYPE "JournalAction" AS ENUM ('SESSION_CREATED', 'FILES_UPLOADED', 'MATCHING_STARTED', 'MATCHING_COMPLETED', 'AI_SCORING_STARTED', 'AI_SCORING_COMPLETED', 'MATCH_AUTO_APPROVED', 'MATCH_SENT_TO_REVIEW', 'MATCH_APPROVED', 'MATCH_REJECTED', 'ENTRY_POSTED', 'MISSING_GENERATED', 'PROPOSAL_POSTED', 'REPORT_EXPORTED', 'EVALUATION_RUN');

-- CreateEnum
CREATE TYPE "ProposalSide" AS ENUM ('BANK', 'LEDGER');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'POSTED');

-- CreateTable
CREATE TABLE "ReconciliationSession" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'PROCESSING',
    "bankFileName" TEXT NOT NULL,
    "bankRowCount" INTEGER NOT NULL,
    "ledgerFileName" TEXT NOT NULL,
    "ledgerRowCount" INTEGER NOT NULL,
    "totalMatched" INTEGER NOT NULL DEFAULT 0,
    "totalAutoMatched" INTEGER NOT NULL DEFAULT 0,
    "totalNeedsReview" INTEGER NOT NULL DEFAULT 0,
    "totalUnmatched" INTEGER NOT NULL DEFAULT 0,
    "totalPosted" INTEGER NOT NULL DEFAULT 0,
    "matchRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalBankAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalLedgerAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountDifference" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "aiScoringUsed" BOOLEAN NOT NULL DEFAULT false,
    "aiPairsScored" INTEGER NOT NULL DEFAULT 0,
    "aiProcessingTimeMs" INTEGER NOT NULL DEFAULT 0,
    "rulesProcessingTimeMs" INTEGER NOT NULL DEFAULT 0,
    "precision" DOUBLE PRECISION,
    "recall" DOUBLE PRECISION,
    "f1Score" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,

    CONSTRAINT "ReconciliationSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankTransaction" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "normalizedDescription" TEXT NOT NULL,
    "debit" DOUBLE PRECISION,
    "credit" DOUBLE PRECISION,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" "TransactionType" NOT NULL,
    "balance" DOUBLE PRECISION,
    "reference" TEXT,
    "rowIndex" INTEGER NOT NULL,
    "isMatched" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "normalizedDescription" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" "TransactionType" NOT NULL,
    "reference" TEXT,
    "invoiceNo" TEXT,
    "rowIndex" INTEGER NOT NULL,
    "isMatched" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchResult" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sessionId" TEXT NOT NULL,
    "bankTxnId" TEXT,
    "ledgerEntryId" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'UNMATCHED',
    "matchType" "MatchType" NOT NULL DEFAULT 'UNMATCHED',
    "matchReason" TEXT NOT NULL,
    "bankAmount" DOUBLE PRECISION,
    "ledgerAmount" DOUBLE PRECISION,
    "amountDiff" DOUBLE PRECISION,
    "aiScored" BOOLEAN NOT NULL DEFAULT false,
    "aiConfidence" DOUBLE PRECISION,
    "aiReasoning" TEXT,
    "aiScoredAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "postedAt" TIMESTAMP(3),
    "postedBy" TEXT,

    CONSTRAINT "MatchResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalPost" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT NOT NULL,
    "action" "JournalAction" NOT NULL,
    "description" TEXT NOT NULL,
    "matchResultId" TEXT,
    "proposalId" TEXT,
    "performedBy" TEXT NOT NULL DEFAULT 'system',
    "bankAmount" DOUBLE PRECISION,
    "ledgerAmount" DOUBLE PRECISION,

    CONSTRAINT "JournalPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissingEntryProposal" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sourceSide" "ProposalSide" NOT NULL,
    "bankTxnId" TEXT,
    "ledgerEntryId" TEXT,
    "proposedDate" TIMESTAMP(3) NOT NULL,
    "proposedDescription" TEXT NOT NULL,
    "proposedAmount" DOUBLE PRECISION NOT NULL,
    "proposedType" "TransactionType" NOT NULL,
    "proposedReference" TEXT,
    "proposedInvoiceNo" TEXT,
    "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),

    CONSTRAINT "MissingEntryProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReconciliationSession_createdAt_idx" ON "ReconciliationSession"("createdAt");

-- CreateIndex
CREATE INDEX "ReconciliationSession_status_idx" ON "ReconciliationSession"("status");

-- CreateIndex
CREATE INDEX "BankTransaction_sessionId_idx" ON "BankTransaction"("sessionId");

-- CreateIndex
CREATE INDEX "BankTransaction_sessionId_amount_type_idx" ON "BankTransaction"("sessionId", "amount", "type");

-- CreateIndex
CREATE INDEX "BankTransaction_sessionId_date_idx" ON "BankTransaction"("sessionId", "date");

-- CreateIndex
CREATE INDEX "LedgerEntry_sessionId_idx" ON "LedgerEntry"("sessionId");

-- CreateIndex
CREATE INDEX "LedgerEntry_sessionId_amount_type_idx" ON "LedgerEntry"("sessionId", "amount", "type");

-- CreateIndex
CREATE INDEX "LedgerEntry_sessionId_date_idx" ON "LedgerEntry"("sessionId", "date");

-- CreateIndex
CREATE INDEX "MatchResult_sessionId_idx" ON "MatchResult"("sessionId");

-- CreateIndex
CREATE INDEX "MatchResult_sessionId_status_idx" ON "MatchResult"("sessionId", "status");

-- CreateIndex
CREATE INDEX "MatchResult_sessionId_matchType_idx" ON "MatchResult"("sessionId", "matchType");

-- CreateIndex
CREATE INDEX "MatchResult_sessionId_confidence_idx" ON "MatchResult"("sessionId", "confidence");

-- CreateIndex
CREATE INDEX "JournalPost_sessionId_idx" ON "JournalPost"("sessionId");

-- CreateIndex
CREATE INDEX "JournalPost_sessionId_createdAt_idx" ON "JournalPost"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "JournalPost_action_idx" ON "JournalPost"("action");

-- CreateIndex
CREATE INDEX "MissingEntryProposal_sessionId_idx" ON "MissingEntryProposal"("sessionId");

-- CreateIndex
CREATE INDEX "MissingEntryProposal_sessionId_status_idx" ON "MissingEntryProposal"("sessionId", "status");

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ReconciliationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ReconciliationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ReconciliationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_bankTxnId_fkey" FOREIGN KEY ("bankTxnId") REFERENCES "BankTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "LedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalPost" ADD CONSTRAINT "JournalPost_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ReconciliationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissingEntryProposal" ADD CONSTRAINT "MissingEntryProposal_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ReconciliationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissingEntryProposal" ADD CONSTRAINT "MissingEntryProposal_bankTxnId_fkey" FOREIGN KEY ("bankTxnId") REFERENCES "BankTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissingEntryProposal" ADD CONSTRAINT "MissingEntryProposal_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "LedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
