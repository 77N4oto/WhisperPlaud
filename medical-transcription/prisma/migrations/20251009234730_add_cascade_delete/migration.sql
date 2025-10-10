-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Job" (
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
    CONSTRAINT "Job_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Job" ("completedAt", "createdAt", "error", "fileId", "id", "phase", "progress", "result", "startedAt", "status", "type") SELECT "completedAt", "createdAt", "error", "fileId", "id", "phase", "progress", "result", "startedAt", "status", "type" FROM "Job";
DROP TABLE "Job";
ALTER TABLE "new_Job" RENAME TO "Job";
CREATE INDEX "Job_fileId_idx" ON "Job"("fileId");
CREATE INDEX "Job_status_idx" ON "Job"("status");
CREATE TABLE "new_Transcript" (
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
    CONSTRAINT "Transcript_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Transcript" ("confidence", "corrections", "createdAt", "fileId", "id", "language", "segments", "speakers", "summaryLong", "summaryMedium", "summaryShort", "text", "words") SELECT "confidence", "corrections", "createdAt", "fileId", "id", "language", "segments", "speakers", "summaryLong", "summaryMedium", "summaryShort", "text", "words" FROM "Transcript";
DROP TABLE "Transcript";
ALTER TABLE "new_Transcript" RENAME TO "Transcript";
CREATE UNIQUE INDEX "Transcript_fileId_key" ON "Transcript"("fileId");
CREATE INDEX "Transcript_fileId_idx" ON "Transcript"("fileId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
