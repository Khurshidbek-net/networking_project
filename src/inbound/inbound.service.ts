import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInboundShipmentDto } from './dto/create-inbound-shipment.dto';
import { UpdateInboundShipmentDto } from './dto/update-inbound-shipment.dto';
import { InboundQueryDto } from './dto/inbound-query.dto';

@Injectable()
export class InboundService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: InboundQueryDto) {
    const { page = 1, limit = 10, search, status } = query || {};
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { receivingId: { contains: search, mode: 'insensitive' } },
        { supplierName: { contains: search, mode: 'insensitive' } },
        { poNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      this.prisma.inboundShipment.findMany({
        where,
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inboundShipment.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const shipment = await this.prisma.inboundShipment.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    if (!shipment) {
      throw new NotFoundException(`Inbound shipment with ID ${id} not found`);
    }

    return shipment;
  }

  async create(createInboundShipmentDto: CreateInboundShipmentDto) {
    const { items, ...shipmentData } = createInboundShipmentDto;

    // Generate receiving ID
    const receivingId = await this.generateReceivingId();

    // Calculate totals
    const totalItems = items.reduce(
      (sum, item) => sum + item.quantityExpected,
      0,
    );
    const totalValue = items.reduce(
      (sum, item) => sum + item.quantityExpected * (item.unitCost || 0),
      0,
    );

    return await this.prisma.inboundShipment.create({
      data: {
        ...shipmentData,
        receivingId,
        totalItems,
        totalValue,
        items: {
          create: items.map((item) => ({
            ...item,
            totalCost: item.quantityExpected * (item.unitCost || 0),
          })),
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async update(id: string, updateInboundShipmentDto: UpdateInboundShipmentDto) {
    await this.findOne(id); // Check if exists

    // Exclude 'items' from update if present
    const { items, ...shipmentData } = updateInboundShipmentDto;

    return await this.prisma.inboundShipment.update({
      where: { id },
      data: shipmentData,
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async markAsReceived(id: string) {
    const shipment = await this.findOne(id);

    // Update shipment status and received date
    const updatedShipment = await this.prisma.inboundShipment.update({
      where: { id },
      data: {
        status: 'RECEIVED',
        receivedDate: new Date(),
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Update inventory for each item
    for (const item of shipment.items) {
      await this.updateInventoryFromReceipt(item);
    }

    return updatedShipment;
  }

  async getPendingReceipts() {
    return await this.prisma.inboundShipment.findMany({
      where: {
        status: {
          in: ['SCHEDULED', 'IN_TRANSIT'],
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { expectedDate: 'asc' },
    });
  }

  private async generateReceivingId(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    const prefix = `RCV-${year}${month}${day}`;

    const lastShipment = await this.prisma.inboundShipment.findFirst({
      where: {
        receivingId: {
          startsWith: prefix,
        },
      },
      orderBy: {
        receivingId: 'desc',
      },
    });

    let sequence = 1;
    if (lastShipment) {
      const lastSequence = Number.parseInt(
        lastShipment.receivingId.split('-')[1].slice(-3),
      );
      sequence = lastSequence + 1;
    }

    return `${prefix}-${String(sequence).padStart(3, '0')}`;
  }

  private async updateInventoryFromReceipt(item: any) {
    // Find existing inventory or create new one
    const existingInventory = await this.prisma.inventory.findFirst({
      where: {
        productId: item.productId,
      },
    });

    if (existingInventory) {
      // Update existing inventory
      await this.prisma.inventory.update({
        where: { id: existingInventory.id },
        data: {
          quantityAvailable: {
            increment: item.quantityExpected,
          },
          quantityTotal: {
            increment: item.quantityExpected,
          },
          lastCounted: new Date(),
        },
      });
    } else {
      // Create new inventory record
      const warehouses = await this.prisma.warehouse.findMany();
      const defaultWarehouse = warehouses[0]; // Use first warehouse as default

      if (defaultWarehouse) {
        await this.prisma.inventory.create({
          data: {
            productId: item.productId,
            warehouseId: defaultWarehouse.id,
            quantityAvailable: item.quantityExpected,
            quantityTotal: item.quantityExpected,
            lastCounted: new Date(),
          },
        });
      }
    }

    // Create inventory adjustment record
    await this.prisma.inventoryAdjustment.create({
      data: {
        productId: item.productId,
        warehouseId: existingInventory?.warehouseId || '',
        adjustmentType: 'increase',
        quantityBefore: existingInventory?.quantityAvailable || 0,
        quantityAfter:
          (existingInventory?.quantityAvailable || 0) + item.quantityExpected,
        quantityChange: item.quantityExpected,
        reason: `Inbound receipt: ${item.product.name}`,
      },
    });
  }
}
