-- Migration: add acceptedTermsAt and termsVersion to users
ALTER TABLE "users" ADD COLUMN "acceptedTermsAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "termsVersion" TEXT;
