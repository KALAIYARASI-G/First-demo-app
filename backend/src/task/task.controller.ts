import { Controller, Get, Post, Put, Body, UseGuards, Request, Param } from '@nestjs/common';
import { JointAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TaskService } from './task.service';

@Controller('api/tasks')
@UseGuards(JointAuthGuard, RolesGuard)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  @Roles('MANAGER')
  createTask(
    @Request() req,
    @Body() body: { title: string; description: string; assignedToId: number },
  ) {
    const managerId = req.user.id;
    return this.taskService.create(body.title, body.description, body.assignedToId, managerId);
  }

  @Get()
  @Roles('MANAGER', 'WORKER')
  getTasks(@Request() req) {
    if (req.user.role === 'WORKER') {
      return this.taskService.findByWorker(req.user.id);
    }
    return this.taskService.findAll();
  }

  @Put(':id/status')
  @Roles('WORKER', 'MANAGER')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' },
  ) {
    return this.taskService.updateStatus(Number(id), body.status);
  }
}
