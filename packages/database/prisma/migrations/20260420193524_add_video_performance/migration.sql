-- CreateTable
CREATE TABLE "video_performances" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "views" INTEGER NOT NULL DEFAULT 0,
    "watchTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_performances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "video_performances_projectId_idx" ON "video_performances"("projectId");

-- CreateIndex
CREATE INDEX "video_performances_projectId_recordedAt_idx" ON "video_performances"("projectId", "recordedAt");

-- CreateIndex
CREATE INDEX "video_performances_recordedAt_idx" ON "video_performances"("recordedAt");

-- AddForeignKey
ALTER TABLE "video_performances" ADD CONSTRAINT "video_performances_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "content_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
