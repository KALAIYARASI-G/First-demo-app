import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { PrismaService } from '../prisma.service';

@Injectable()
export class CognitoStrategy extends PassportStrategy(Strategy, 'cognito') {
  constructor(private prisma: PrismaService) {
    const userPoolId = process.env.COGNITO_USER_POOL_ID || 'us-east-1_example';
    const region = process.env.COGNITO_REGION || 'us-east-1';
    const jwksUri = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      _audience: process.env.COGNITO_CLIENT_ID,
      issuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
      algorithms: ['RS256'],
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: jwksUri,
      }),
    });
  }

  async validate(payload: any) {
    // Check if the user exists in our local PostgreSQL database
    const cognitoSub = payload.sub;
    let user = await this.prisma.user.findUnique({
      where: { cognitoSub },
    });

    if (!user) {
      // In production, sync from Cognito claims
      user = await this.prisma.user.create({
        data: {
          cognitoSub,
          username: payload['cognito:username'] || payload.email || 'user',
          email: payload.email || 'user@example.com',
          role: payload['custom:role'] === 'MANAGER' ? 'MANAGER' : 'WORKER',
        },
      });
    }

    return {
      id: Number(user.id),
      cognitoSub: user.cognitoSub,
      username: user.username,
      email: user.email,
      role: user.role,
    };
  }
}
