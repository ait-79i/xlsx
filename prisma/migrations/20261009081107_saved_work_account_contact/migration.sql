-- AlterTable
ALTER TABLE "users" ADD COLUMN     "session_version" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "mappings" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_requests" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "headers" JSONB NOT NULL,
    "body" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mappings_user_id_kind_name_key" ON "mappings"("user_id", "kind", "name");

-- CreateIndex
CREATE UNIQUE INDEX "saved_requests_user_id_name_key" ON "saved_requests"("user_id", "name");

-- AddForeignKey
ALTER TABLE "mappings" ADD CONSTRAINT "mappings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_requests" ADD CONSTRAINT "saved_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
