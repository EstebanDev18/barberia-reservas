-- CreateEnum
CREATE TYPE "public"."BarbershopStatus" AS ENUM ('PENDING_PAYMENT', 'ACTIVE');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'VOIDED', 'ERROR');

-- CreateTable
CREATE TABLE "public"."Barbershop" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "status" "public"."BarbershopStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "paidUntil" TIMESTAMP(3),
    "passwordHash" TEXT NOT NULL DEFAULT '',
    "databaseName" TEXT NOT NULL DEFAULT '',
    "theme" TEXT NOT NULL DEFAULT 'callejero',
    "accent" TEXT NOT NULL DEFAULT '',
    "heroImage" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "mapsUrl" TEXT NOT NULL DEFAULT '',
    "whatsapp" TEXT NOT NULL DEFAULT '',
    "instagram" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Barbershop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Payment" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "amountInCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "provider" TEXT NOT NULL DEFAULT 'wompi',
    "providerTransactionId" TEXT,
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Barbershop_slug_key" ON "public"."Barbershop"("slug");

-- CreateIndex
CREATE INDEX "Barbershop_email_idx" ON "public"."Barbershop"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_reference_key" ON "public"."Payment"("reference");

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "public"."Barbershop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
