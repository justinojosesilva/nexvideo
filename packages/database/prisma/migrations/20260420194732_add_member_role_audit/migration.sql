-- CreateTable
CREATE TABLE "member_role_audits" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "changedByUserId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "previousRole" "Role" NOT NULL,
    "newRole" "Role" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_role_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "member_role_audits_organizationId_idx" ON "member_role_audits"("organizationId");

-- CreateIndex
CREATE INDEX "member_role_audits_targetUserId_idx" ON "member_role_audits"("targetUserId");

-- CreateIndex
CREATE INDEX "member_role_audits_changedAt_idx" ON "member_role_audits"("changedAt");
