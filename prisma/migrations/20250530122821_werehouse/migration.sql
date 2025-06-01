/*
  Warnings:

  - You are about to drop the column `warehouse_id` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the `warehouses` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "inventory" DROP CONSTRAINT "inventory_warehouse_id_fkey";

-- DropIndex
DROP INDEX "inventory_product_id_warehouse_id_location_key";

-- AlterTable
ALTER TABLE "inventory" DROP COLUMN "warehouse_id";

-- DropTable
DROP TABLE "warehouses";
