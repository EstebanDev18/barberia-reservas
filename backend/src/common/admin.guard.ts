import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}
  async canActivate(context: ExecutionContext) {
    const token = context.switchToHttp().getRequest().headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Inicia sesión como administrador.');
    try { const payload = await this.jwt.verifyAsync(token); return payload.role === 'admin'; } catch { throw new UnauthorizedException('Sesión inválida o vencida.'); }
  }
}
