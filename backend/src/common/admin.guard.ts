import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, createParamDecorator } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

// El token del panel trae la barbería: todo lo que hace el admin queda limitado a ella.
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Inicia sesión como administrador.');
    let payload: { role?: string; shopId?: string };
    try { payload = await this.jwt.verifyAsync(token); } catch { throw new UnauthorizedException('Sesión inválida o vencida.'); }
    if (payload.role !== 'admin' || !payload.shopId) throw new UnauthorizedException('Sesión inválida o vencida.');
    request.shopId = payload.shopId;
    return true;
  }
}

export const ShopId = createParamDecorator((_: unknown, context: ExecutionContext): string => context.switchToHttp().getRequest().shopId);
