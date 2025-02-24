-- CreateTable
CREATE TABLE "download_links" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "folderId" TEXT,
    "documentId" TEXT,
    "createdById" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "downloads" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "download_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "download_links_token_key" ON "download_links"("token");

-- CreateIndex
CREATE INDEX "download_links_token_idx" ON "download_links"("token");

-- CreateIndex
CREATE INDEX "download_links_folderId_idx" ON "download_links"("folderId");

-- CreateIndex
CREATE INDEX "download_links_documentId_idx" ON "download_links"("documentId");

-- CreateIndex
CREATE INDEX "download_links_companyId_idx" ON "download_links"("companyId");

-- AddForeignKey
ALTER TABLE "download_links" ADD CONSTRAINT "download_links_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "download_links" ADD CONSTRAINT "download_links_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "download_links" ADD CONSTRAINT "download_links_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "download_links" ADD CONSTRAINT "download_links_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE; 