import { PAYMENT_METHODS, PAYMENT_PROVIDERS } from '@pay/contracts';
import { ApiProperty } from '@nestjs/swagger';

export class ProviderCapabilitiesDto {
  @ApiProperty({ enum: PAYMENT_PROVIDERS, example: 'mock' })
  id!: string;

  @ApiProperty({ enum: PAYMENT_METHODS, isArray: true, example: ['card', 'mobile_money'] })
  methods!: string[];

  @ApiProperty({ type: [String], example: ['EUR', 'XOF'] })
  currencies!: string[];

  @ApiProperty({ type: [String], example: ['FR', 'SN'] })
  countries!: string[];

  @ApiProperty({ example: false })
  partialRefunds!: boolean;

  @ApiProperty({ example: false })
  hostedCheckout!: boolean;

  @ApiProperty({ example: true })
  requiresCustomerAction!: boolean;
}
