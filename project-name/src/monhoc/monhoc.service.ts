import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateMonHocDto } from '../dto/create-monhoc.dto.js';
import { MonHoc } from './monhoc.js';

@Injectable()
export class MonHocService {
  constructor(
    @InjectRepository(MonHoc)
    private readonly monHocRepository: Repository<MonHoc>,
  ) {}

  async findAll(): Promise<MonHoc[]> {
    return this.monHocRepository.find();
  }

  async findOne(id: number): Promise<MonHoc> {
    const monHoc = await this.monHocRepository.findOne({ where: { id } });

    if (!monHoc) {
      throw new NotFoundException(`Môn học với id ${id} không tồn tại.`);
    }

    return monHoc;
  }

  async create(dto: CreateMonHocDto): Promise<MonHoc> {
    const existByMaMH = await this.monHocRepository.findOne({
      where: { maMH: dto.maMH },
    });

    if (existByMaMH) {
      throw new ConflictException(`Mã môn học ${dto.maMH} đã tồn tại.`);
    }

    const monHoc = this.monHocRepository.create(dto);
    return this.monHocRepository.save(monHoc);
  }
}
