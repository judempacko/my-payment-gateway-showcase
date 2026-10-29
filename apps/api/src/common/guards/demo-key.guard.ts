import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { Env } from '../../config/env';
import { safeEqual } from '../crypto';

@Injectable()
export class DemoKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService<Env, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.header('authorization');
    const provided =
      request.header('x-demo-key') ??
      (authorization?.toLowerCase().startsWith('bearer ')
        ? authorization.slice(7).trim()
        : undefined);
    const expected = this.config.get('DEMO_API_KEY', { infer: true });

    if (!provided || !safeEqual(provided, expected)) {
      throw new UnauthorizedException('Invalid or missing demo API key');
    }

    return true;
  }
}
