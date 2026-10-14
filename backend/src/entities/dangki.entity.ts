import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { Sinhvien } from './sinhvien.entities';
import { Monhoc } from './monhoc.entities';

@Entity('dangki')
export class Dangki {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Sinhvien, (sinhvien) => sinhvien.dangkis, { onDelete: 'CASCADE' })
  sinhvien: Sinhvien;

  @ManyToOne(() => Monhoc, (monhoc) => monhoc.dangkis, { onDelete: 'CASCADE' })
  monhoc: Monhoc;

  @CreateDateColumn()
  ngaydangki: Date;
}