import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DangKi } from './dangki.js';
import { MonHoc } from '../monhoc/monhoc.js';
import { SinhVien } from '../sinhvien/sinhvien.js';
import { DangKiService } from './dangki.service.js';

describe('DangKiService', () => {
  const dangKiRepository = {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
  };
  const sinhVienRepository = { findOne: vi.fn() };
  const monHocRepository = { findOne: vi.fn() };
  let service: DangKiService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        DangKiService,
        { provide: getRepositoryToken(DangKi), useValue: dangKiRepository },
        { provide: getRepositoryToken(SinhVien), useValue: sinhVienRepository },
        { provide: getRepositoryToken(MonHoc), useValue: monHocRepository },
      ],
    }).compile();

    service = module.get(DangKiService);
  });

  it('lists registrations with student and subject details', async () => {
    const registrations = [{ id: 1 }];
    dangKiRepository.find.mockResolvedValue(registrations);

    await expect(service.findAll()).resolves.toBe(registrations);
    expect(dangKiRepository.find).toHaveBeenCalledWith({
      relations: { sinhVien: true, monHoc: true },
      order: { id: 'DESC' },
    });
  });

  it('creates and saves a registration for an existing student and subject', async () => {
    const student = { id: 1, maSV: 'SV001' };
    const subject = { id: 2, maMH: 'CS101' };
    const registration = { sinhVien: student, monHoc: subject, ghiChu: 'Hoc ky 1' };
    sinhVienRepository.findOne.mockResolvedValue(student);
    monHocRepository.findOne.mockResolvedValue(subject);
    dangKiRepository.findOne.mockResolvedValue(null);
    dangKiRepository.create.mockReturnValue(registration);
    dangKiRepository.save.mockResolvedValue({ id: 3, ...registration });

    await expect(
      service.dangKy({ sinhVienId: 1, monHocId: 2, ghiChu: 'Hoc ky 1' }),
    ).resolves.toEqual({ id: 3, ...registration });

    expect(dangKiRepository.create).toHaveBeenCalledWith(registration);
    expect(dangKiRepository.save).toHaveBeenCalledWith(registration);
  });

  it('rejects registration when the student does not exist', async () => {
    sinhVienRepository.findOne.mockResolvedValue(null);

    await expect(
      service.dangKy({ sinhVienId: 1, monHocId: 2 }),
    ).rejects.toThrow('Sinh viên với id 1 không tồn tại.');
    expect(monHocRepository.findOne).not.toHaveBeenCalled();
    expect(dangKiRepository.save).not.toHaveBeenCalled();
  });

  it('rejects registration when the subject does not exist', async () => {
    sinhVienRepository.findOne.mockResolvedValue({ id: 1 });
    monHocRepository.findOne.mockResolvedValue(null);

    await expect(
      service.dangKy({ sinhVienId: 1, monHocId: 2 }),
    ).rejects.toThrow('Môn học với id 2 không tồn tại.');
    expect(dangKiRepository.save).not.toHaveBeenCalled();
  });

  it('rejects a duplicate student-subject registration', async () => {
    sinhVienRepository.findOne.mockResolvedValue({ id: 1, maSV: 'SV001' });
    monHocRepository.findOne.mockResolvedValue({ id: 2, maMH: 'CS101' });
    dangKiRepository.findOne.mockResolvedValue({ id: 3 });

    await expect(
      service.dangKy({ sinhVienId: 1, monHocId: 2 }),
    ).rejects.toThrow('đã đăng ký môn CS101 rồi.');
    expect(dangKiRepository.save).not.toHaveBeenCalled();
  });
});
