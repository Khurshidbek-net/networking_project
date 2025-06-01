import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePickListDto } from './dto/create-pick-list.dto';
import { UpdateOutboundShipmentDto } from './dto/update-outbound-shipment.dto';
import { OutboundQueryDto } from './dto/outbound-query.dto';

@Injectable()
export class OutboundService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: OutboundQueryDto) {
    const { page = 1, limit = 10, search, status } = query || {};
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { shipmentId: { contains: search, mode: 'insensitive' } },
        { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
        { order: { customerName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      this.prisma.outboundShipment.findMany({
        where,
        include: {
          order: {
            include: {
              orderItems: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.outboundShipment.count({ where }),
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
    const shipment = await this.prisma.outboundShipment.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            orderItems: {
              include: {
                product: {
                  include: {
                    category: true,
                    inventory: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!shipment) {
      throw new NotFoundException(`Outbound shipment with ID ${id} not found`);
    }

    return shipment;
  }

  async generatePickList(createPickListDto: CreatePickListDto) {
    const { orderId } = createPickListDto;

    // Check if order exists
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                inventory: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    // Generate shipment ID
    const shipmentId = await this.generateShipmentId();

    // Create outbound shipment
    const outboundShipment = await this.prisma.outboundShipment.create({
      data: {
        shipmentId,
        orderId,
        status: 'PICKING',
      },
      include: {
        order: {
          include: {
            orderItems: {
              include: {
                product: {
                  include: {
                    inventory: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Generate pick list with locations
    const pickList = order.orderItems.map((item) => {
      const inventory = item.product.inventory[0]; // Get first inventory location
      return {
        productId: item.productId,
        sku: item.product.sku,
        name: item.product.name,
        quantityOrdered: item.quantityOrdered,
        location: inventory?.location || 'Unknown',
        available: inventory?.quantityAvailable || 0,
      };
    });

    return {
      shipment: outboundShipment,
      pickList,
    };
  }

  async update(
    id: string,
    updateOutboundShipmentDto: UpdateOutboundShipmentDto,
  ) {
    await this.findOne(id); // Check if exists

    return await this.prisma.outboundShipment.update({
      where: { id },
      data: updateOutboundShipmentDto,
      include: {
        order: {
          include: {
            orderItems: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });
  }

  async updatePickingStatus(id: string, pickerId: string, status: string) {
    // const shipment = await this.findOne(id);

    return await this.prisma.outboundShipment.update({
      where: { id },
      data: {
        pickerId,
        status: status as any,
        updatedAt: new Date(),
      },
      include: {
        order: true,
      },
    });
  }

  async markAsShipped(id: string, carrier: string, trackingNumber: string) {
    const shipment = await this.findOne(id);

    const updatedShipment = await this.prisma.outboundShipment.update({
      where: { id },
      data: {
        status: 'SHIPPED',
        carrier,
        trackingNumber,
        shippedDate: new Date(),
        updatedAt: new Date(),
      },
      include: {
        order: {
          include: {
            orderItems: true,
          },
        },
      },
    });

    // Update order status to completed
    await this.prisma.order.update({
      where: { id: shipment.orderId },
      data: {
        status: 'COMPLETED',
        updatedAt: new Date(),
      },
    });

    return updatedShipment;
  }

  private async generateShipmentId(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    const prefix = `SHP-${year}${month}${day}`;

    const lastShipment = await this.prisma.outboundShipment.findFirst({
      where: {
        shipmentId: {
          startsWith: prefix,
        },
      },
      orderBy: {
        shipmentId: 'desc',
      },
    });

    let sequence = 1;
    if (lastShipment) {
      const lastSequence = Number.parseInt(
        lastShipment.shipmentId.split('-')[1].slice(-3),
      );
      sequence = lastSequence + 1;
    }

    return `${prefix}-${String(sequence).padStart(3, '0')}`;
  }
}
