import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { DangKi } from '../dangki/dangki.js';

@Entity('monhoc')
export class MonHoc {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  maMH: string;

  @Column()
  tenMonHoc: string;

  @Column()
  soTinChi: number;

  @OneToMany(() => DangKi, (dangKi) => dangKi.monHoc)
  dangKis: DangKi[];
}
