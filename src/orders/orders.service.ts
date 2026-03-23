import {
  Injectable, NotFoundException, BadRequestException,
  ForbiddenException, Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Order, OrderDocument, OrderStatus, STATUS_TRANSITIONS,
} from './schemas/order.schema';
import { ProductsService } from '../products/products.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private productsService: ProductsService,
  ) {}

  async create(dto: CreateOrderDto, customerId: string): Promise<OrderDocument> {
    const orderItems: { productId: Types.ObjectId; name: string; unitPrice: number; quantity: number }[] = [];
    let total = 0;

    for (const item of dto.items) {
      const product = await this.productsService.findOne(
        new Types.ObjectId(item.productId),
      );

      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Estoque insuficiente para "${product.name}": disponível ${product.stock}, solicitado ${item.quantity}`,
        );
      }

      orderItems.push({
        productId: product._id,
        name: product.name,
        unitPrice: product.price,
        quantity: item.quantity,
      });

      total += product.price * item.quantity;

      // Decrement stock
      await this.productsService.update(product._id as Types.ObjectId, {
        stock: product.stock - item.quantity,
      });
    }

    const customerOid = new Types.ObjectId(customerId);

    const order = await this.orderModel.create({
      customer: customerOid,
      items: orderItems,
      total: Math.round(total * 100) / 100,
      status: OrderStatus.PENDING,
      statusHistory: [
        { status: OrderStatus.PENDING, changedAt: new Date(), changedBy: customerOid },
      ],
    });

    this.logger.log(`Order created: ${order._id} by customer ${customerId}`);
    return order;
  }

  async findAll(page = 1, limit = 20): Promise<{ data: OrderDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.orderModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.orderModel.countDocuments(),
    ]);
    return { data, total };
  }

  async findByCustomer(
    customerId: string, page = 1, limit = 20,
  ): Promise<{ data: OrderDocument[]; total: number }> {
    const filter = { customer: new Types.ObjectId(customerId) };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.orderModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.orderModel.countDocuments(filter),
    ]);
    return { data, total };
  }

  async findOne(id: Types.ObjectId, requesterId: string, requesterRole: string): Promise<OrderDocument> {
    const order = await this.orderModel.findById(id);
    if (!order) throw new NotFoundException('Pedido não encontrado');

    if (requesterRole !== 'ADMIN' && order.customer.toString() !== requesterId) {
      throw new ForbiddenException('Acesso negado');
    }

    return order;
  }

  async updateStatus(
    id: Types.ObjectId, dto: UpdateOrderStatusDto, adminId: string,
  ): Promise<OrderDocument> {
    const order = await this.orderModel.findById(id);
    if (!order) throw new NotFoundException('Pedido não encontrado');

    const allowed = STATUS_TRANSITIONS[order.status];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Transição inválida: ${order.status} → ${dto.status}. Permitidas: ${allowed.join(', ') || 'nenhuma'}`,
      );
    }

    order.status = dto.status;
    order.statusHistory.push({
      status: dto.status,
      changedAt: new Date(),
      changedBy: new Types.ObjectId(adminId),
    });

    await order.save();
    this.logger.log(`Order ${id} status → ${dto.status} by admin ${adminId}`);
    return order;
  }

  async cancel(id: Types.ObjectId, customerId: string): Promise<OrderDocument> {
    const order = await this.orderModel.findById(id);
    if (!order) throw new NotFoundException('Pedido não encontrado');

    if (order.customer.toString() !== customerId) {
      throw new ForbiddenException('Acesso negado');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        'Apenas pedidos com status PENDING podem ser cancelados pelo cliente',
      );
    }

    order.status = OrderStatus.CANCELLED;
    order.statusHistory.push({
      status: OrderStatus.CANCELLED,
      changedAt: new Date(),
      changedBy: new Types.ObjectId(customerId),
    });

    await order.save();
    this.logger.log(`Order ${id} cancelled by customer ${customerId}`);
    return order;
  }
}
