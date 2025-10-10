-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "s3Bucket" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "duration" REAL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "phase" TEXT,
    "error" TEXT,
    "result" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Job_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transcript" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileId" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'ja',
    "text" TEXT NOT NULL,
    "segments" TEXT NOT NULL,
    "words" TEXT,
    "speakers" TEXT,
    "summaryShort" TEXT,
    "summaryMedium" TEXT,
    "summaryLong" TEXT,
    "corrections" TEXT,
    "confidence" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transcript_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MedicalDictionary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "term" TEXT NOT NULL,
    "reading" TEXT,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "englishTerm" TEXT,
    "aliases" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Medication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brandName" TEXT NOT NULL,
    "genericName" TEXT,
    "manufacturer" TEXT NOT NULL,
    "drugClass" TEXT,
    "indications" TEXT,
    "phonetic" TEXT,
    "aliases" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "UserDictionary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "term" TEXT NOT NULL,
    "replacement" TEXT NOT NULL,
    "context" TEXT,
    "frequency" INTEGER NOT NULL DEFAULT 0,
    "autoApply" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "File_s3Key_key" ON "File"("s3Key");

-- CreateIndex
CREATE INDEX "File_status_idx" ON "File"("status");

-- CreateIndex
CREATE INDEX "File_uploadedAt_idx" ON "File"("uploadedAt");

-- CreateIndex
CREATE INDEX "Job_fileId_idx" ON "Job"("fileId");

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");

-- CreateIndex
CREATE INDEX "Transcript_fileId_idx" ON "Transcript"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalDictionary_term_key" ON "MedicalDictionary"("term");

-- CreateIndex
CREATE INDEX "MedicalDictionary_term_idx" ON "MedicalDictionary"("term");

-- CreateIndex
CREATE INDEX "MedicalDictionary_category_idx" ON "MedicalDictionary"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Medication_brandName_key" ON "Medication"("brandName");

-- CreateIndex
CREATE INDEX "Medication_manufacturer_idx" ON "Medication"("manufacturer");

-- CreateIndex
CREATE INDEX "Medication_brandName_idx" ON "Medication"("brandName");

-- CreateIndex
CREATE INDEX "UserDictionary_term_idx" ON "UserDictionary"("term");
