import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { MonHoc } from '../monhoc/monhoc.js';
import { SinhVien } from '../sinhvien/sinhvien.js';

@Entity('dangki')
export class DangKi {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => SinhVien, (sinhVien) => sinhVien.dangKis, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sinhVienId' })
  sinhVien: SinhVien;

  @ManyToOne(() => MonHoc, (monHoc) => monHoc.dangKis, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'monHocId' })
  monHoc: MonHoc;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  ngayDangKy: Date;

  @Column({ default: '' })
  ghiChu: string;
}
