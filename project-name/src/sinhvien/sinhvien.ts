
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { DangKi } from '../dangki/dangki.js';

@Entity('sinhvien')
export class SinhVien {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  maSV: string;

  @Column()
  ten: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @OneToMany(() => DangKi, (dangKi) => dangKi.sinhVien)
  dangKis: DangKi[];
}