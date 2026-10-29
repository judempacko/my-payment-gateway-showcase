import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProductResponseDto } from './dto/product-response.dto';
import { CatalogService } from './catalog.service';

@ApiTags('catalog')
@Controller('products')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  @ApiOperation({ summary: 'List active catalog products' })
  @ApiOkResponse({ type: [ProductResponseDto] })
  list(): Promise<ProductResponseDto[]> {
    return this.catalog.list();
  }
}
