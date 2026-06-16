import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { JointAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma.service';

@Controller('api/location')
@UseGuards(JointAuthGuard)
export class LocationController {
  constructor(private prisma: PrismaService) {}

  @Post('update')
  async updateLocation(
    @Request() req,
    @Body() body: { latitude: number; longitude: number },
  ) {
    const userId = BigInt(req.user.id);
    await this.prisma.locationLog.create({
      data: {
        userId,
        latitude: body.latitude,
        longitude: body.longitude,
      },
    });

    return { message: 'Location updated successfully' };
  }

  @Get('history')
  async getLocationHistory(@Request() req) {
    const userId = BigInt(req.user.id);
    const locations = await this.prisma.locationLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });

    return locations.map((loc) => ({
      id: Number(loc.id),
      latitude: loc.latitude,
      longitude: loc.longitude,
      timestamp: loc.timestamp,
    }));
  }
}
