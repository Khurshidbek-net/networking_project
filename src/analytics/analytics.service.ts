import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardAnalytics() {
    const [
      totalInventory,
      pendingOrders,
      inboundToday,
      outboundToday,
      lowStockCount,
      recentActivities,
    ] = await Promise.all([
      this.prisma.inventory.aggregate({
        _sum: { quantityTotal: true },
      }),
      this.prisma.order.count({
        where: { status: 'PENDING' },
      }),
      this.prisma.inboundShipment.count({
        where: {
          expectedDate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
      this.prisma.outboundShipment.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
      this.getLowStockCount(),
      this.getRecentActivities(),
    ]);

    return {
      totalInventory: totalInventory._sum.quantityTotal || 0,
      pendingOrders,
      inboundToday,
      outboundToday,
      lowStockCount,
      recentActivities,
    };
  }

  async getInventoryAnalytics() {
    const [
      totalItems,
      totalValue,
      turnoverRate,
      topMovingProducts,
      warehouseUtilization,
      categoryDistribution,
    ] = await Promise.all([
      this.prisma.inventory.count(),
      this.prisma.inventory
        .findMany({
          include: { product: true },
        })
        .then((items) =>
          items.reduce(
            (sum, item) =>
              sum + item.quantityTotal * Number(item.product.unitPrice || 0),
            0,
          ),
        ),
      this.calculateTurnoverRate(),
      this.getTopMovingProducts(),
      this.getWarehouseUtilization(),
      this.getCategoryDistribution(),
    ]);

    return {
      totalItems,
      totalValue,
      turnoverRate,
      topMovingProducts,
      warehouseUtilization,
      categoryDistribution,
    };
  }

  async getOrderAnalytics(period = 'month') {
    const dateFilter = this.getDateFilter(period);

    const [
      totalOrders,
      ordersByStatus,
      totalValue,
      averageOrderValue,
      fulfillmentRate,
      topCustomers,
    ] = await Promise.all([
      this.prisma.order.count({
        where: { createdAt: dateFilter },
      }),
      this.prisma.order.groupBy({
        by: ['status'],
        where: { createdAt: dateFilter },
        _count: { status: true },
      }),
      this.prisma.order.aggregate({
        where: { createdAt: dateFilter },
        _sum: { totalValue: true },
      }),
      this.prisma.order.aggregate({
        where: { createdAt: dateFilter },
        _avg: { totalValue: true },
      }),
      this.calculateFulfillmentRate(dateFilter),
      this.getTopCustomers(dateFilter),
    ]);

    return {
      totalOrders,
      ordersByStatus: ordersByStatus.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {}),
      totalValue: totalValue._sum.totalValue || 0,
      averageOrderValue: averageOrderValue._avg.totalValue || 0,
      fulfillmentRate,
      topCustomers,
    };
  }

  async getPerformanceMetrics() {
    const [
      inventoryTurnover,
      orderFulfillmentRate,
      warehouseUtilization,
      averagePickTime,
      onTimeDeliveryRate,
    ] = await Promise.all([
      this.calculateTurnoverRate(),
      this.calculateFulfillmentRate(),
      this.calculateAverageWarehouseUtilization(),
      this.calculateAveragePickTime(),
      this.calculateOnTimeDeliveryRate(),
    ]);

    return {
      inventoryTurnover,
      orderFulfillmentRate,
      warehouseUtilization,
      averagePickTime,
      onTimeDeliveryRate,
    };
  }

  private async getLowStockCount() {
    const inventory = await this.prisma.inventory.findMany({
      include: { product: true },
    });

    return inventory.filter(
      (item) => item.quantityAvailable <= (item.product.minimumStock || 0),
    ).length;
  }

  private async getRecentActivities() {
    const [orders, adjustments, shipments] = await Promise.all([
      this.prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.inventoryAdjustment.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { product: true },
      }),
      this.prisma.outboundShipment.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { order: true },
      }),
    ]);

    const activities = [
      ...orders.map((order) => ({
        type: 'order',
        description: `New order ${order.orderNumber} from ${order.customerName}`,
        timestamp: order.createdAt,
      })),
      ...adjustments.map((adj) => ({
        type: 'adjustment',
        description: `Inventory adjusted for ${adj.product.name}`,
        timestamp: adj.createdAt,
      })),
      ...shipments.map((ship) => ({
        type: 'shipment',
        description: `Shipment ${ship.shipmentId} ${ship.status.toLowerCase()}`,
        timestamp: ship.createdAt,
      })),
    ];

    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);
  }

  private async calculateTurnoverRate() {
    // Simplified calculation - in real scenario, you'd use COGS and average inventory
    return 4.2;
  }

  private async getTopMovingProducts() {
    return await this.prisma.inventory
      .findMany({
        take: 5,
        orderBy: { quantityTotal: 'desc' },
        include: { product: true },
      })
      .then((items) =>
        items.map((item) => ({
          sku: item.product.sku,
          name: item.product.name,
          quantity: item.quantityTotal,
        })),
      );
  }

  private async getWarehouseUtilization() {
    return await this.prisma.warehouse
      .findMany({
        include: { inventory: true },
      })
      .then((warehouses) =>
        warehouses.map((warehouse) => ({
          name: warehouse.name,
          utilization:
            warehouse.usedCapacity && warehouse.totalCapacity
              ? Math.round(
                  (warehouse.usedCapacity / warehouse.totalCapacity) * 100,
                )
              : 0,
        })),
      );
  }

  private async getCategoryDistribution() {
    const grouped = await this.prisma.product.groupBy({
      by: ['categoryId'],
      _count: { categoryId: true },
    });

    // Filter out null categoryIds
    const categoryIds = grouped
      .map((g) => g.categoryId)
      .filter((id): id is string => id !== null);

    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
    });

    // Merge category info
    return grouped.map((g) => ({
      ...g,
      category: categories.find((c) => c.id === g.categoryId) || null,
    }));
  }

  private async calculateFulfillmentRate(dateFilter?: any) {
    const totalOrders = await this.prisma.order.count({
      where: { createdAt: dateFilter },
    });

    const completedOrders = await this.prisma.order.count({
      where: {
        status: 'COMPLETED',
        createdAt: dateFilter,
      },
    });

    return totalOrders > 0
      ? Math.round((completedOrders / totalOrders) * 100)
      : 0;
  }

  private async getTopCustomers(dateFilter?: any) {
    return await this.prisma.order
      .groupBy({
        by: ['customerName'],
        where: { createdAt: dateFilter },
        _count: { customerName: true },
        _sum: { totalValue: true },
        orderBy: {
          _count: { customerName: 'desc' },
        },
        take: 5,
      })
      .then((customers) =>
        customers.map((customer) => ({
          name: customer.customerName,
          orderCount: customer._count.customerName,
          totalValue: customer._sum.totalValue || 0,
        })),
      );
  }

  private async calculateAverageWarehouseUtilization() {
    const warehouses = await this.prisma.warehouse.findMany();
    const totalUtilization = warehouses.reduce((sum, warehouse) => {
      if (warehouse.totalCapacity && warehouse.usedCapacity) {
        return sum + (warehouse.usedCapacity / warehouse.totalCapacity) * 100;
      }
      return sum;
    }, 0);

    return warehouses.length > 0
      ? Math.round(totalUtilization / warehouses.length)
      : 0;
  }

  private async calculateAveragePickTime() {
    // Simplified calculation - in real scenario, you'd track actual pick times
    return await '12.5 min';
  }

  private async calculateOnTimeDeliveryRate() {
    // Simplified calculation - in real scenario, you'd compare delivery dates
    return await 98.5;
  }

  private getDateFilter(period: string) {
    const now = new Date();
    const startDate = new Date();

    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    return {
      gte: startDate,
      lte: now,
    };
  } 
}



