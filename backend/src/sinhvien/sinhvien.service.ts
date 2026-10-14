import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSinhVienDto } from '../dto/create-sinhvien.dto.js';
import { SinhVien } from './sinhvien.js';

@Injectable()
export class SinhVienService {
  constructor(
    @InjectRepository(SinhVien)
    private readonly sinhVienRepository: Repository<SinhVien>,
  ) {}

  async findAll(): Promise<SinhVien[]> {
    return this.sinhVienRepository.find();
  }

  async findOne(id: number): Promise<SinhVien> {
    const sinhVien = await this.sinhVienRepository.findOne({ where: { id } });

    if (!sinhVien) {
      throw new NotFoundException(`Sinh viên với id ${id} không tồn tại.`);
    }

    return sinhVien;
  }

  async create(dto: CreateSinhVienDto): Promise<SinhVien> {
    const existByMaSV = await this.sinhVienRepository.findOne({
      where: { maSV: dto.maSV },
    });

    if (existByMaSV) {
      throw new ConflictException(`Mã sinh viên ${dto.maSV} đã tồn tại.`);
    }

    const existByEmail = await this.sinhVienRepository.findOne({
      where: { email: dto.email },
    });

    if (existByEmail) {
      throw new ConflictException(`Email ${dto.email} đã được sử dụng.`);
    }

    const sinhVien = this.sinhVienRepository.create({
      ...dto,
      password: dto.password,
    });
    return this.sinhVienRepository.save(sinhVien);
  }
}
