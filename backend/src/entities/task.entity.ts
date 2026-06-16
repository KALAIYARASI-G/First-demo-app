import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ length: 100 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 20, default: 'PENDING' })
  status: 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

  @ManyToOne(() => User, (user) => user.assignedTasks, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
