import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common"
import { PrismaService } from "../prisma/prisma.service"
import { CreateOrderDto } from "./dto/create-order.dto"
import { UpdateOrderDto } from "./dto/update-order.dto"
import { OrderQueryDto } from "./dto/order-query.dto"
import { OrderStatus } from "@prisma/client"

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) { }

  async findAll(query: OrderQueryDto) {
    const { page = 1, limit = 10, search, status, priority } = query || {}
    const skip = (page - 1) * limit

    const where: any = {}

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { customerEmail: { contains: search, mode: "insensitive" } },
      ]
    }

    if (status) {
      where.status = status
    }

    if (priority) {
      where.priority = priority
    }

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          orderItems: {
            include: {
              product: true,
            },
          },
          outboundShipments: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.order.count({ where }),
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
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
        outboundShipments: true,
        inventoryReservations: true,
      },
    })

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`)
    }

    return order
  }

  async create(createOrderDto: CreateOrderDto) {
    const { orderItems, ...orderData } = createOrderDto

    const orderNumber = await this.generateOrderNumber()

    const totalValue = orderItems.reduce((sum, item) => sum + item.quantityOrdered * item.unitPrice, 0)

    const order = await this.prisma.order.create({
      data: {
        ...orderData,
        orderNumber,
        totalValue,
        orderItems: {
          create: orderItems.map((item) => ({
            ...item,
            quantityOrdered: item.quantityOrdered,
            totalPrice: item.quantityOrdered * item.unitPrice,
          })),
        },
      },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    })

    await this.reserveInventoryForOrder(order.id)

    return order
  }

  async update(id: string, updateOrderDto: UpdateOrderDto) {
    await this.findOne(id)

    const { orderItems, ...orderData } = updateOrderDto
    const updateData: any = orderData

    if (orderItems) {
      const totalValue = orderItems.reduce((sum, item) => sum + item.quantityOrdered * item.unitPrice, 0)
      updateData.totalValue = totalValue
    }

    return this.prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    })
  }

  async updateStatus(id: string, newStatus: string, userId?: string) {
    const order = await this.findOne(id)

    if (!Object.values(OrderStatus).includes(newStatus as OrderStatus)) {
      throw new BadRequestException("Invalid order status")
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: {
        status: newStatus as OrderStatus,
        updatedAt: new Date(),
      },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    })

    switch (newStatus) {
      case OrderStatus.PROCESSING:
        await this.createOutboundShipment(id)
        break
      case OrderStatus.COMPLETED:
        await this.completeOrder(id)
        break
      case OrderStatus.CANCELLED:
        await this.cancelOrder(id)
        break
    }

    return updatedOrder
  }

  async remove(id: string) {
    await this.findOne(id)

    await this.releaseInventoryReservations(id)

    return this.prisma.order.delete({
      where: { id },
    })
  }

  async getAnalytics() {
    const [totalOrders, ordersByStatus, totalValue, averageOrderValue, topCustomers] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.groupBy({
        by: ["status"],
        _count: {
          status: true,
        },
      }),
      this.prisma.order.aggregate({
        _sum: {
          totalValue: true,
        },
      }),
      this.prisma.order.aggregate({
        _avg: {
          totalValue: true,
        },
      }),
      this.prisma.order.groupBy({
        by: ["customerName"],
        _count: {
          customerName: true,
        },
        _sum: {
          totalValue: true,
        },
        orderBy: {
          _count: {
            customerName: "desc",
          },
        },
        take: 5,
      }),
    ])

    return {
      totalOrders,
      ordersByStatus: ordersByStatus.reduce((acc, item) => {
        acc[item.status] = item._count.status
        return acc
      }, {}),
      totalValue: totalValue._sum.totalValue || 0,
      averageOrderValue: averageOrderValue._avg.totalValue || 0,
      topCustomers: topCustomers.map((customer) => ({
        name: customer.customerName,
        orderCount: customer._count.customerName,
        totalValue: customer._sum.totalValue || 0,
      })),
    }
  }

  private async generateOrderNumber(): Promise<string> {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, "0")
    const day = String(today.getDate()).padStart(2, "0")

    const prefix = `ORD-${year}${month}${day}`

    const lastOrder = await this.prisma.order.findFirst({
      where: {
        orderNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        orderNumber: "desc",
      },
    })

    let sequence = 1
    if (lastOrder) {
      const lastSequence = Number.parseInt(lastOrder.orderNumber.split("-")[1].slice(-3))
      sequence = lastSequence + 1
    }

    return `${prefix}-${String(sequence).padStart(3, "0")}`
  }

  private async reserveInventoryForOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true,
      },
    })

    if (!order) return

    const reservations = order.orderItems.map((item) => ({
      productId: item.productId,
      orderId: orderId,
      quantityReserved: item.quantityOrdered,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }))

    await this.prisma.inventoryReservation.createMany({
      data: reservations,
    })

    for (const item of order.orderItems) {
      await this.prisma.inventory.updateMany({
        where: {
          productId: item.productId,
        },
        data: {
          quantityReserved: {
            increment: item.quantityOrdered,
          },
        },
      })
    }
  }

  private async createOutboundShipment(orderId: string) {
    const shipmentId = `SHP-${Date.now()}`

    await this.prisma.outboundShipment.create({
      data: {
        shipmentId,
        orderId,
        status: "PICKING",
      },
    })
  }

  private async completeOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true,
      },
    })

    if (!order) return

    for (const item of order.orderItems) {
      await this.prisma.inventory.updateMany({
        where: {
          productId: item.productId,
        },
        data: {
          quantityAvailable: {
            decrement: item.quantityOrdered,
          },
          quantityReserved: {
            decrement: item.quantityOrdered,
          },
          quantityTotal: {
            decrement: item.quantityOrdered,
          },
        },
      })
    }

    await this.prisma.inventoryReservation.updateMany({
      where: {
        orderId,
        status: "active",
      },
      data: {
        status: "fulfilled",
      },
    })
  }

  private async cancelOrder(orderId: string) {
    await this.releaseInventoryReservations(orderId)
  }

  private async releaseInventoryReservations(orderId: string) {
    const reservations = await this.prisma.inventoryReservation.findMany({
      where: {
        orderId,
        status: "active",
      },
    })

    for (const reservation of reservations) {
      await this.prisma.inventory.updateMany({
        where: {
          productId: reservation.productId,
        },
        data: {
          quantityReserved: {
            decrement: reservation.quantityReserved,
          },
        },
      })
    }

    await this.prisma.inventoryReservation.updateMany({
      where: {
        orderId,
        status: "active",
      },
      data: {
        status: "expired",
      },
    })
  }
}
