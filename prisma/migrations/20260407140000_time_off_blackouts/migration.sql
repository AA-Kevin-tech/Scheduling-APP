-- CreateTable
CREATE TABLE "TimeOffBlackout" (
    "id" TEXT NOT NULL,
    "startsOnYmd" TEXT NOT NULL,
    "endsOnYmd" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeOffBlackout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimeOffBlackout_startsOnYmd_endsOnYmd_idx" ON "TimeOffBlackout"("startsOnYmd", "endsOnYmd");
