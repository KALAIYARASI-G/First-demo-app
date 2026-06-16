import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles: ('MANAGER' | 'WORKER')[]) => SetMetadata('roles', roles);
