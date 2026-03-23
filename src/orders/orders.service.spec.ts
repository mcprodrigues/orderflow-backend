import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { OrdersService } from './orders.service';
import { Order, OrderStatus } from './schemas/order.schema';
import { ProductsService } from '../products/products.service';

const customerId = new Types.ObjectId().toString();
const adminId = new Types.ObjectId().toString();
const orderId = new Types.ObjectId();
const productId = new Types.ObjectId();

const mockProduct = {
  _id: productId,
  name: 'Camiseta',
  price: 49.9,
  stock: 10,
  active: true,
};

const mockOrder = {
  _id: orderId,
  customer: new Types.ObjectId(customerId),
  items: [{ productId, name: 'Camiseta', unitPrice: 49.9, quantity: 2 }],
  total: 99.8,
  status: OrderStatus.PENDING,
  statusHistory: [{ status: OrderStatus.PENDING, changedAt: new Date(), changedBy: new Types.ObjectId(customerId) }],
  save: jest.fn().mockResolvedValue(undefined),
};

const mockOrderModel = {
  create: jest.fn(),
  find: jest.fn().mockReturnValue({ sort: () => ({ skip: () => ({ limit: () => ({ exec: () => Promise.resolve([mockOrder]) }) }) }) }),
  findById: jest.fn(),
  countDocuments: jest.fn().mockResolvedValue(1),
};

const mockProductsService = {
  findOne: jest.fn(),
  update: jest.fn(),
};

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getModelToken(Order.name), useValue: mockOrderModel },
        { provide: ProductsService, useValue: mockProductsService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an order and decrement stock', async () => {
      mockProductsService.findOne.mockResolvedValue(mockProduct);
      mockProductsService.update.mockResolvedValue(undefined);
      mockOrderModel.create.mockResolvedValue(mockOrder);

      const result = await service.create(
        { items: [{ productId: productId.toString(), quantity: 2 }] },
        customerId,
      );

      expect(mockProductsService.update).toHaveBeenCalledWith(
        productId,
        { stock: 8 },
      );
      expect(result).toBe(mockOrder);
    });

    it('should throw BadRequestException when stock is insufficient', async () => {
      mockProductsService.findOne.mockResolvedValue({ ...mockProduct, stock: 1 });

      await expect(
        service.create({ items: [{ productId: productId.toString(), quantity: 5 }] }, customerId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateStatus', () => {
    it('should advance status along valid transition', async () => {
      mockOrderModel.findById.mockResolvedValue({ ...mockOrder });

      const order = { ...mockOrder, save: jest.fn().mockResolvedValue(undefined) };
      mockOrderModel.findById.mockResolvedValue(order);

      await service.updateStatus(orderId, { status: OrderStatus.PROCESSING }, adminId);

      expect(order.status).toBe(OrderStatus.PROCESSING);
      expect(order.statusHistory).toHaveLength(2);
      expect(order.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException on invalid status transition', async () => {
      const order = { ...mockOrder, status: OrderStatus.DELIVERED, save: jest.fn() };
      mockOrderModel.findById.mockResolvedValue(order);

      await expect(
        service.updateStatus(orderId, { status: OrderStatus.PENDING }, adminId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockOrderModel.findById.mockResolvedValue(null);

      await expect(
        service.updateStatus(orderId, { status: OrderStatus.PROCESSING }, adminId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancel', () => {
    it('should cancel a PENDING order by the owner', async () => {
      const order = { ...mockOrder, save: jest.fn().mockResolvedValue(undefined) };
      mockOrderModel.findById.mockResolvedValue(order);

      await service.cancel(orderId, customerId);

      expect(order.status).toBe(OrderStatus.CANCELLED);
    });

    it('should throw ForbiddenException when another customer tries to cancel', async () => {
      mockOrderModel.findById.mockResolvedValue(mockOrder);
      const otherId = new Types.ObjectId().toString();

      await expect(service.cancel(orderId, otherId)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when order is not PENDING', async () => {
      const order = { ...mockOrder, status: OrderStatus.SHIPPED, save: jest.fn() };
      mockOrderModel.findById.mockResolvedValue(order);

      await expect(service.cancel(orderId, customerId)).rejects.toThrow(BadRequestException);
    });
  });
});
