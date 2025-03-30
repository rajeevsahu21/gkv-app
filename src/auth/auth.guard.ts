import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
    private usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('Access Denied: No token provided');
    }
    try {
      const { _id } = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });
      const user = await this.usersService.findOneAndUpdate(
        {
          _id,
        },
        { lastActivityAt: new Date() },
      );
      if (!user) {
        throw new UnauthorizedException(
          'The user belonging to this token does no longer exist.',
        );
      }
      request['user'] = user;
    } catch {
      throw new UnauthorizedException('Access Denied: Invalid token');
    }
    return true;
  }

  private extractTokenFromHeader(req: Request): string | undefined {
    return (
      (req.headers['x-access-token'] as string) ||
      (req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
        ? req.headers.authorization.split(' ')[1]
        : undefined)
    );
    // const [type, token] = request.headers.authorization?.split(' ') ?? [];
    // return type === 'Bearer' ? token : undefined;
  }
}
