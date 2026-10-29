import { ApiProperty } from '@nestjs/swagger';

export class ProductResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'portfolio-pro' })
  slug!: string;

  @ApiProperty({ example: 'Portfolio Pro' })
  name!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ example: '4900', description: 'Amount in minor units as a string' })
  amountMinor!: string;

  @ApiProperty({ example: 'EUR' })
  currency!: string;
}
