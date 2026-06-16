import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class TaskService {
  constructor(private prisma: PrismaService) {}

  async create(title: string, description: string, assignedToId: number, createdById: number) {
    return this.prisma.task.create({
      data: {
        title,
        description,
        assignedTo: { connect: { id: BigInt(assignedToId) } },
        createdBy: { connect: { id: BigInt(createdById) } },
      },
    });
  }

  async findAll() {
    const tasks = await this.prisma.task.findMany({
      include: { assignedTo: true, createdBy: true },
    });
    return tasks.map(task => this.serializeBigInt(task));
  }

  async findByWorker(workerId: number) {
    const tasks = await this.prisma.task.findMany({
      where: { assignedToId: BigInt(workerId) },
    });
    return tasks.map(task => this.serializeBigInt(task));
  }

  async updateStatus(id: number, status: 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED') {
    const task = await this.prisma.task.update({
      where: { id: BigInt(id) },
      data: { status, updatedAt: new Date() },
    });
    return this.serializeBigInt(task);
  }

  private serializeBigInt(obj: any) {
    if (!obj) return null;
    const serialized = { ...obj };
    if (serialized.id) serialized.id = Number(serialized.id);
    if (serialized.assignedToId) serialized.assignedToId = Number(serialized.assignedToId);
    if (serialized.createdById) serialized.createdById = Number(serialized.createdById);
    if (serialized.assignedTo) {
      serialized.assignedTo = { ...serialized.assignedTo, id: Number(serialized.assignedTo.id) };
    }
    if (serialized.createdBy) {
      serialized.createdBy = { ...serialized.createdBy, id: Number(serialized.createdBy.id) };
    }
    return serialized;
  }
}
