-- CreateTable
CREATE TABLE "QuickBooksConnection" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "realmId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "accessTokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "scope" TEXT,
    "companyName" TEXT,
    "connectedByUserId" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuickBooksConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuickBooksConnection_realmId_key" ON "QuickBooksConnection"("realmId");

-- AddForeignKey
ALTER TABLE "QuickBooksConnection" ADD CONSTRAINT "QuickBooksConnection_connectedByUserId_fkey" FOREIGN KEY ("connectedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
