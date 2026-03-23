import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async create(dto: CreateProductDto): Promise<ProductDocument> {
    const product = await this.productModel.create(dto);
    this.logger.log(`Product created: ${product._id} — ${product.name}`);
    return product;
  }

  async findAll(page = 1, limit = 20): Promise<{ data: ProductDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.productModel.find({ active: true }).skip(skip).limit(limit).exec(),
      this.productModel.countDocuments({ active: true }),
    ]);
    return { data, total };
  }

  async findOne(id: Types.ObjectId): Promise<ProductDocument> {
    const product = await this.productModel.findOne({ _id: id, active: true });
    if (!product) throw new NotFoundException('Produto não encontrado');
    return product;
  }

  async update(id: Types.ObjectId, dto: UpdateProductDto): Promise<ProductDocument> {
    const product = await this.productModel.findByIdAndUpdate(id, dto, { new: true });
    if (!product) throw new NotFoundException('Produto não encontrado');
    return product;
  }

  async remove(id: Types.ObjectId): Promise<void> {
    const product = await this.productModel.findByIdAndUpdate(id, { active: false });
    if (!product) throw new NotFoundException('Produto não encontrado');
    this.logger.log(`Product deactivated: ${id}`);
  }
}
