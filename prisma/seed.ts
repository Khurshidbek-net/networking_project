import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Starting database seed...")

  // Create warehouse
  const warehouse = await prisma.warehouse.create({
    data: {
      name: "Main Warehouse",
      address: "123 Industrial Blvd, City, State 12345",
      totalCapacity: 10000,
      usedCapacity: 6500,
      zones: {
        A: { capacity: 2500, type: "fasteners" },
        B: { capacity: 2000, type: "sealing" },
        C: { capacity: 3000, type: "raw_materials" },
        D: { capacity: 2500, type: "finished_goods" },
      },
    },
  })

  // Create categories
  const fasteners = await prisma.category.create({
    data: {
      name: "Fasteners",
      description: "Bolts, screws, nuts, and washers",
    },
  })

  const rawMaterials = await prisma.category.create({
    data: {
      name: "Raw Materials",
      description: "Steel, aluminum, and other base materials",
    },
  })

  const sealing = await prisma.category.create({
    data: {
      name: "Sealing",
      description: "Gaskets, O-rings, and sealing materials",
    },
  })

  // Create products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        sku: "SKU-001",
        name: "Steel Bolts M8 x 50mm",
        description: "High-grade steel bolts",
        categoryId: fasteners.id,
        unitPrice: 0.25,
        weight: 0.05,
        minimumStock: 500,
        dimensions: { length: 50, diameter: 8, unit: "mm" },
      },
    }),
    prisma.product.create({
      data: {
        sku: "SKU-002",
        name: "Aluminum Sheet 2mm",
        description: "2mm thick aluminum sheets",
        categoryId: rawMaterials.id,
        unitPrice: 45.0,
        weight: 2.5,
        minimumStock: 50,
        dimensions: { length: 1000, width: 500, thickness: 2, unit: "mm" },
      },
    }),
    prisma.product.create({
      data: {
        sku: "SKU-045",
        name: "Steel Bolts M6 x 30mm",
        description: "Standard steel bolts",
        categoryId: fasteners.id,
        unitPrice: 0.2,
        weight: 0.03,
        minimumStock: 100,
        dimensions: { length: 30, diameter: 6, unit: "mm" },
      },
    }),
    prisma.product.create({
      data: {
        sku: "SKU-078",
        name: "Rubber Gaskets 50mm",
        description: "Industrial rubber gaskets",
        categoryId: sealing.id,
        unitPrice: 2.5,
        weight: 0.1,
        minimumStock: 50,
        dimensions: { diameter: 50, thickness: 3, unit: "mm" },
      },
    }),
  ])

  // Create inventory
  await Promise.all([
    prisma.inventory.create({
      data: {
        productId: products[0].id,
        warehouseId: warehouse.id,
        location: "A-1-3",
        quantityAvailable: 1100,
        quantityReserved: 150,
        quantityTotal: 1250,
        lastCounted: new Date(),
      },
    }),
    prisma.inventory.create({
      data: {
        productId: products[1].id,
        warehouseId: warehouse.id,
        location: "C-1-2",
        quantityAvailable: 65,
        quantityReserved: 20,
        quantityTotal: 85,
        lastCounted: new Date(),
      },
    }),
    prisma.inventory.create({
      data: {
        productId: products[2].id,
        warehouseId: warehouse.id,
        location: "A-1-3",
        quantityAvailable: 45,
        quantityReserved: 0,
        quantityTotal: 45,
        lastCounted: new Date(),
      },
    }),
    prisma.inventory.create({
      data: {
        productId: products[3].id,
        warehouseId: warehouse.id,
        location: "B-2-1",
        quantityAvailable: 18,
        quantityReserved: 5,
        quantityTotal: 23,
        lastCounted: new Date(),
      },
    }),
  ])

  // Create sample orders
  const order1 = await prisma.order.create({
    data: {
      orderNumber: "ORD-20240115-001",
      customerName: "ABC Manufacturing",
      customerEmail: "orders@abc-mfg.com",
      status: "PROCESSING",
      priority: "HIGH",
      totalValue: 2450.0,
      dueDate: new Date("2024-01-18"),
      orderItems: {
        create: [
          {
            productId: products[0].id,
            quantityOrdered: 100,
            unitPrice: 0.25,
            totalPrice: 25.0,
          },
          {
            productId: products[1].id,
            quantityOrdered: 50,
            unitPrice: 45.0,
            totalPrice: 2250.0,
          },
        ],
      },
    },
  })

  const order2 = await prisma.order.create({
    data: {
      orderNumber: "ORD-20240115-002",
      customerName: "XYZ Industries",
      customerEmail: "purchasing@xyz-ind.com",
      status: "PENDING",
      priority: "MEDIUM",
      totalValue: 165.0,
      dueDate: new Date("2024-01-20"),
      orderItems: {
        create: [
          {
            productId: products[2].id,
            quantityOrdered: 200,
            unitPrice: 0.2,
            totalPrice: 40.0,
          },
          {
            productId: products[3].id,
            quantityOrdered: 50,
            unitPrice: 2.5,
            totalPrice: 125.0,
          },
        ],
      },
    },
  })

  // Create inbound shipment
  await prisma.inboundShipment.create({
    data: {
      receivingId: "RCV-20240115-001",
      supplierName: "Steel Corp Ltd",
      poNumber: "PO-2024-001",
      expectedDate: new Date("2024-01-16"),
      status: "IN_TRANSIT",
      totalItems: 500,
      totalValue: 125.0,
      items: {
        create: [
          {
            productId: products[0].id,
            quantityExpected: 500,
            unitCost: 0.25,
            totalCost: 125.0,
          },
        ],
      },
    },
  })

  // Create outbound shipment
  await prisma.outboundShipment.create({
    data: {
      shipmentId: "SHP-20240115-001",
      orderId: order1.id,
      status: "PICKING",
      carrier: "FedEx",
    },
  })

  console.log("✅ Database seed completed successfully!")
  console.log(`📦 Created warehouse: ${warehouse.name}`)
  console.log(`📂 Created ${products.length} products`)
  console.log(`🛒 Created 2 sample orders`)
  console.log(`📥 Created 1 inbound shipment`)
  console.log(`📤 Created 1 outbound shipment`)
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
