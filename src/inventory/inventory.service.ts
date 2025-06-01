import { Injectable, NotFoundException } from "@nestjs/common"
import  { PrismaService } from "../prisma/prisma.service"
import  { CreateInventoryDto } from "./dto/create-inventory.dto"
import  { UpdateInventoryDto } from "./dto/update-inventory.dto"
import  { AdjustInventoryDto } from "./dto/adjust-inventory.dto"
import  { InventoryQueryDto } from "./dto/inventory-query.dto"

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: InventoryQueryDto) {
    const { page = 1, limit = 10, search, warehouseId, lowStock } = query || {}
    const skip = (page - 1) * limit

    const where: any = {}

    if (search) {
      where.OR = [
        { product: { name: { contains: search, mode: "insensitive" } } },
        { product: { sku: { contains: search, mode: "insensitive" } } },
      ]
    }

    if (warehouseId) {
      where.warehouseId = warehouseId
    }

    if (lowStock) {
      where.quantityAvailable = {
        lte: this.prisma.inventory.fields.quantityAvailable,
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.inventory.findMany({
        where,
        include: {
          product: {
            include: {
              category: true,
            },
          },
          warehouse: true,
        },
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
      }),
      this.prisma.inventory.count({ where }),
    ])

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  async findOne(id: string) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { id },
      include: {
        product: {
          include: {
            category: true,
          },
        },
        warehouse: true,
      },
    })

    if (!inventory) {
      throw new NotFoundException(`Inventory item with ID ${id} not found`)
    }

    return inventory
  }

  async create(createInventoryDto: CreateInventoryDto) {
    return this.prisma.inventory.create({
      data: {
        ...createInventoryDto,
        quantityTotal: createInventoryDto.quantityAvailable + (createInventoryDto.quantityReserved || 0),
      },
      include: {
        product: true,
        warehouse: true,
      },
    })
  }

  async update(id: string, updateInventoryDto: UpdateInventoryDto) {
    const inventory = await this.findOne(id)

    const updatedData = {
      ...updateInventoryDto,
    }

    if (updateInventoryDto.quantityAvailable !== undefined || updateInventoryDto.quantityReserved !== undefined) {
      const quantityAvailable = updateInventoryDto.quantityAvailable ?? inventory.quantityAvailable
      const quantityReserved = updateInventoryDto.quantityReserved ?? inventory.quantityReserved
      updatedData.quantityAvailable = quantityAvailable + quantityReserved
    }

    return this.prisma.inventory.update({
      where: { id },
      data: updatedData,
      include: {
        product: true,
        warehouse: true,
      },
    })
  }

  async adjustInventory(adjustInventoryDto: AdjustInventoryDto) {
    const { productId, warehouseId, adjustmentType, quantity, reason, userId } = adjustInventoryDto

    // Find inventory item
    const inventory = await this.prisma.inventory.findFirst({
      where: {
        productId,
        warehouseId,
      },
    })

    if (!inventory) {
      throw new NotFoundException("Inventory item not found")
    }

    const quantityBefore = inventory.quantityAvailable
    let quantityAfter: number

    switch (adjustmentType) {
      case "increase":
        quantityAfter = quantityBefore + quantity
        break
      case "decrease":
        quantityAfter = Math.max(0, quantityBefore - quantity)
        break
      case "count":
        quantityAfter = quantity
        break
      default:
        throw new Error("Invalid adjustment type")
    }

    const quantityChange = quantityAfter - quantityBefore

    // Update inventory and create adjustment record in transaction
    const result = await this.prisma.$transaction([
      this.prisma.inventory.update({
        where: { id: inventory.id },
        data: {
          quantityAvailable: quantityAfter,
          quantityTotal: quantityAfter + inventory.quantityReserved,
          updatedAt: new Date(),
        },
      }),
      this.prisma.inventoryAdjustment.create({
        data: {
          productId,
          warehouseId,
          adjustmentType,
          quantityBefore,
          quantityAfter,
          quantityChange,
          reason,
          userId,
        },
      }),
    ])

    return {
      inventory: result[0],
      adjustment: result[1],
    }
  }

  async getLowStockAlerts() {
    const lowStockItems = await this.prisma.inventory.findMany({
      where: {
        quantityAvailable: {
          lte: this.prisma.inventory.fields.quantityAvailable,
        },
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
        warehouse: true,
      },
    })

    // Filter items where available quantity is less than or equal to minimum stock
    const filteredItems = lowStockItems.filter((item) => item.quantityAvailable <= (item.product.minimumStock || 0))

    return filteredItems
  }

  async getAnalytics() {
    const [totalItems, lowStockCount, totalValue, topMovingProducts, warehouseUtilization] = await Promise.all([
      this.prisma.inventory.count(),
      this.getLowStockAlerts().then((items) => items.length),
      this.prisma.inventory.aggregate({
        _sum: {
          quantityTotal: true,
        },
      }),
      this.prisma.inventory.findMany({
        include: {
          product: true,
        },
        orderBy: {
          quantityTotal: "desc",
        },
        take: 5,
      }),
      this.prisma.warehouse.findMany({
        include: {
          inventory: true,
        },
      }),
    ])

    return {
      totalItems,
      lowStockCount,
      totalQuantity: totalValue._sum.quantityTotal || 0,
      topMovingProducts: topMovingProducts.map((item) => ({
        sku: item.product.sku,
        name: item.product.name,
        quantity: item.quantityTotal,
      })),
      warehouseUtilization: warehouseUtilization.map((warehouse) => ({
        name: warehouse.name,
        utilization:
          warehouse.usedCapacity && warehouse.totalCapacity
            ? Math.round((warehouse.usedCapacity / warehouse.totalCapacity) * 100)
            : 0,
      })),
    }
  }

  async remove(id: string) {
    await this.findOne(id) // Check if exists
    return this.prisma.inventory.delete({
      where: { id },
    })
  }
}
