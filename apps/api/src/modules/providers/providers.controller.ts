import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProviderRegistry } from './provider.registry';
import { ProviderCapabilitiesDto } from './dto/provider-capabilities.dto';

@ApiTags('providers')
@Controller('providers')
export class ProvidersController {
  constructor(private readonly registry: ProviderRegistry) {}

  @Get()
  @ApiOperation({ summary: 'List configured payment providers and their capabilities' })
  @ApiOkResponse({ type: [ProviderCapabilitiesDto] })
  list(): ProviderCapabilitiesDto[] {
    return this.registry.list();
  }
}
