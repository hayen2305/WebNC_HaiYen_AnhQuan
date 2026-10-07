import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDangKiDto } from '../dto/create-dangki.dto.js';
import { DangKi } from './dangki.js';
import { MonHoc } from '../monhoc/monhoc.js';
import { SinhVien } from '../sinhvien/sinhvien.js';

@Injectable()
export class DangKiService {
  constructor(
    @InjectRepository(DangKi)
    private readonly dangKiRepository: Repository<DangKi>,
    @InjectRepository(SinhVien)
    private readonly sinhVienRepository: Repository<SinhVien>,
    @InjectRepository(MonHoc)
    private readonly monHocRepository: Repository<MonHoc>,
  ) {}

  async findAll(): Promise<DangKi[]> {
    return this.dangKiRepository.find({
      relations: { sinhVien: true, monHoc: true },
      order: { id: 'DESC' },
    });
  }

  async dangKy(dto: CreateDangKiDto): Promise<DangKi> {
    const sinhVien = await this.sinhVienRepository.findOne({
      where: { id: dto.sinhVienId },
    });

    if (!sinhVien) {
      throw new NotFoundException(`Sinh viên với id ${dto.sinhVienId} không tồn tại.`);
    }

    const monHoc = await this.monHocRepository.findOne({
      where: { id: dto.monHocId },
    });

    if (!monHoc) {
      throw new NotFoundException(`Môn học với id ${dto.monHocId} không tồn tại.`);
    }

    const exist = await this.dangKiRepository.findOne({
      where: {
        sinhVien: { id: dto.sinhVienId },
        monHoc: { id: dto.monHocId },
      },
      relations: { sinhVien: true, monHoc: true },
    });

    if (exist) {
      throw new ConflictException(
        `Sinh viên ${sinhVien.maSV} đã đăng ký môn ${monHoc.maMH} rồi.`,
      );
    }

    const dangKi = this.dangKiRepository.create({
      sinhVien,
      monHoc,
      ghiChu: dto.ghiChu ?? '',
    });

    return this.dangKiRepository.save(dangKi);
  }
}
