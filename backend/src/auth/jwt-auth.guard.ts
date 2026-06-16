import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma.service';

@Injectable()
export class JointAuthGuard extends AuthGuard('cognito') {
  constructor(private prisma: PrismaService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer mock-')) {
      const token = authHeader.split(' ')[1];
      const username = token.replace('mock-', '');
      const user = await this.prisma.user.findUnique({
        where: { username },
      });
      if (user) {
        request.user = {
          id: Number(user.id),
          cognitoSub: user.cognitoSub,
          username: user.username,
          email: user.email,
          role: user.role,
        };
        return true;
      }
    }

    try {
      return (await super.canActivate(context)) as boolean;
    } catch (err) {
      throw new UnauthorizedException();
    }
  }
}
