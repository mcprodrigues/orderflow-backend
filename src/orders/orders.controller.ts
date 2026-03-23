import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, HttpCode, HttpStatus,
  UseGuards, Request,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/schemas/user.schema';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { Types } from 'mongoose';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: '[CUSTOMER] Cria um pedido' })
  @ApiResponse({ status: 400, description: 'Estoque insuficiente ou produto inativo' })
  create(@Body() dto: CreateOrderDto, @Request() req) {
    return this.ordersService.create(dto, req.user.userId);
  }

  @Get('my')
  @ApiOperation({ summary: '[CUSTOMER] Lista meus pedidos' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findMy(
    @Request() req,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.ordersService.findByCustomer(req.user.userId, Number(page), Number(limit));
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Lista todos os pedidos' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.ordersService.findAll(Number(page), Number(limit));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de um pedido (próprio ou admin)' })
  findOne(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Request() req,
  ) {
    return this.ordersService.findOne(id, req.user.userId, req.user.role);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Avança o status de um pedido' })
  updateStatus(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() dto: UpdateOrderStatusDto,
    @Request() req,
  ) {
    return this.ordersService.updateStatus(id, dto, req.user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[CUSTOMER] Cancela um pedido (apenas se PENDING)' })
  @ApiResponse({ status: 400, description: 'Pedido não está em PENDING' })
  cancel(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Request() req,
  ) {
    return this.ordersService.cancel(id, req.user.userId);
  }
}
