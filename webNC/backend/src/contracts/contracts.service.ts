import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../auth/user.repository';
import { RoomRepository } from '../rooms/room.repository';
import { ContractRepository } from './contract.repository';
import { CreateContractDto } from './dto/contract.dto';

/**
 * ContractsService — điều phối transaction giữa Room và Contract
 * (tạo/thanh lý hợp đồng phải đồng thời cập nhật trạng thái phòng).
 */
@Injectable()
export class ContractsService {
  constructor(
    private readonly contractRepository: ContractRepository,
    private readonly roomRepository: RoomRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async create(data: CreateContractDto) {
    const { room_id, tenant_id, deposit, electricity_rate, water_rate, start_date, end_date } = data || ({} as CreateContractDto);
    if (!room_id || !tenant_id || !deposit || !electricity_rate || !water_rate || !start_date || !end_date) {
      throw new BadRequestException('Thiếu thông tin bắt buộc để tạo hợp đồng.');
    }

    const conn = await this.contractRepository.getConnection();
    try {
      await conn.beginTransaction();

      const room = await this.roomRepository.findByIdForUpdate(conn, room_id);
      if (!room) throw new NotFoundException('Không tìm thấy phòng.');
      if (room.status === 'RENTED') {
        throw new ConflictException(`Phòng ${room.room_number} hiện đang có người thuê.`);
      }

      const tenantRow = await this.userRepository.findById(tenant_id);
      if (!tenantRow) throw new NotFoundException('Không tìm thấy khách thuê.');

      const contractId = await this.contractRepository.createWithConnection(conn, {
        room_id, tenant_id, room_number: room.room_number, tenant_name: tenantRow.full_name,
        tenant_phone: data.tenant_phone || tenantRow.phone,
        deposit, electricity_rate, water_rate, service_fee: data.service_fee || 0, start_date, end_date,
      });

      await conn.query(
        `UPDATE rooms SET status = 'RENTED', current_contract_id = ?, tenant_name = ?, end_date = ? WHERE id = ?`,
        [contractId, tenantRow.full_name, end_date, room_id],
      );

      await conn.commit();
      return contractId;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async getActiveByRoom(roomId: string) {
    const contract = await this.contractRepository.findActiveByRoom(roomId);
    if (!contract) throw new NotFoundException('Phòng chưa có hợp đồng đang hiệu lực.');
    return contract;
  }

  async getActiveByTenant(tenantId: number) {
    const contract = await this.contractRepository.findActiveByTenant(tenantId);
    if (!contract) throw new NotFoundException('Bạn hiện không có hợp đồng thuê nào đang hiệu lực.');
    return contract;
  }

  async terminate(contractId: string) {
    const conn = await this.contractRepository.getConnection();
    try {
      await conn.beginTransaction();

      const contract = await this.contractRepository.findByIdForUpdate(conn, contractId);
      if (!contract) throw new NotFoundException('Không tìm thấy hợp đồng.');

      await this.contractRepository.setStatusWithConnection(conn, contract.id, 'EXPIRED');
      await conn.query(
        `UPDATE rooms SET status = 'EMPTY', current_contract_id = NULL, tenant_name = NULL, end_date = NULL WHERE id = ?`,
        [contract.room_id],
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}
