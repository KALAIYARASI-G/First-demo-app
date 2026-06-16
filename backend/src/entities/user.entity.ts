import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Task } from './task.entity';
import { LocationLog } from './location-log.entity';
import { DeviceToken } from './device-token.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'cognito_sub', unique: true, length: 100 })
  cognitoSub: string;

  @Column({ unique: true, length: 50 })
  username: string;

  @Column({ unique: true, length: 100 })
  email: string;

  @Column({ length: 20 })
  role: 'MANAGER' | 'WORKER';

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @OneToMany(() => Task, (task) => task.assignedTo)
  assignedTasks: Task[];

  @OneToMany(() => LocationLog, (log) => log.user)
  locations: LocationLog[];

  @OneToMany(() => DeviceToken, (token) => token.user)
  tokens: DeviceToken[];
}
