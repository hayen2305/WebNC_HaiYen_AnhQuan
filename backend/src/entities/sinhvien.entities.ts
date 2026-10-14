import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Dangki } from './dangki.entity';

@Entity('sinhvien')
export class Sinhvien {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  masv: string;

  @Column()
  hoten: string;

  @Column()
  email: string;

  @OneToMany(() => Dangki, (dangki) => dangki.sinhvien)
  dangkis: Dangki[];
}