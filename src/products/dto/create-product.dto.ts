import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, Min, IsOptional } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Camiseta Preta M' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Camiseta 100% algodão, tamanho M' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 49.9 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 100, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;
}
