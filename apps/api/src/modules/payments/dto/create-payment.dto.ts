import {
  PAYMENT_METHODS,
  PAYMENT_PROVIDERS,
  type PaymentMethod,
  type PaymentProvider,
} from '@pay/contracts';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CustomerDto {
  @ApiProperty({ example: 'Ada Lovelace' })
  @IsString()
  @Length(1, 120)
  name!: string;

  @ApiProperty({ example: 'ada@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: '+221770000000' })
  @IsOptional()
  @Matches(/^\+?[1-9]\d{6,15}$/, { message: 'phone must be a valid E.164-like number' })
  phone?: string;

  @ApiPropertyOptional({ example: 'SN', minLength: 2, maxLength: 2 })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;
}

export class CreatePaymentDto {
  @ApiProperty({ format: 'uuid', example: '00000000-0000-7000-8000-000000000001' })
  @IsString()
  @Length(36, 36)
  productId!: string;

  @ApiProperty({ minimum: 1, maximum: 10, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  quantity = 1;

  @ApiProperty({ enum: PAYMENT_PROVIDERS, example: 'mock' })
  @IsIn(PAYMENT_PROVIDERS)
  provider!: PaymentProvider;

  @ApiProperty({ enum: PAYMENT_METHODS, example: 'card' })
  @IsIn(PAYMENT_METHODS)
  method!: PaymentMethod;

  @ApiProperty({ type: CustomerDto })
  @ValidateNested()
  @Type(() => CustomerDto)
  customer!: CustomerDto;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
