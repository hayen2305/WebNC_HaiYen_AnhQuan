import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { nowInAppTz } from '../common/date.util';
import { ContractRepository } from '../contracts/contract.repository';
import { CloudinaryService } from '../integrations/cloudinary.service';
import { IssueAnalysis, OcrService } from '../integrations/ocr.service';
import { RoomRepository } from '../rooms/room.repository';
import { CreateTicketDto, TicketQueryDto, UpdateTicketDto } from './dto/ticket.dto';
import { TicketRepository } from './ticket.repository';

const TICKET_STATUSES = ['PENDING', 'IN_PROGRESS', 'RESOLVED'];

@Injectable()
export class TicketsService {
  constructor(
    private readonly ticketRepository: TicketRepository,
    private readonly roomRepository: RoomRepository,
    private readonly cloudinaryService: CloudinaryService,
    private readonly ocrService: OcrService,
    private readonly contractRepository: ContractRepository,
  ) {}

  /**
   * Upload ảnh/video sự cố lên Cloudinary; nếu là ảnh thì nhờ AI Vision phân tích
   * thiết bị hỏng, mức độ khẩn cấp để tự động điền biểu mẫu.
   */
  async analyzeImage(fileBuffer: Buffer, mimeType: string) {
    const isVideo = mimeType.startsWith('video/');
    const uploadResult = await this.cloudinaryService.uploadBuffer(fileBuffer, {
      folder: 'rental_management/tickets',
      resourceType: isVideo ? 'video' : 'image',
    });

    let analysis: IssueAnalysis;
    if (isVideo) {
      analysis = {
        device_type: 'Chưa xác định (video)',
        issue_type: 'Cần xem thủ công',
        severity: 'MEDIUM',
        title: 'Sự cố báo cáo qua video',
        summary_vi: 'Video đã được lưu trữ, vui lòng xem trực tiếp để đánh giá vì AI Vision hiện chỉ hỗ trợ phân tích ảnh tĩnh.',
        is_safety_risk: false,
        immediate_actions: [],
        should_call_landlord_urgently: false,
      };
    } else {
      analysis = await this.ocrService.analyzeIssueImage(fileBuffer.toString('base64'), mimeType);
    }

    return { image_url: uploadResult.secure_url, ...analysis };
  }

  async create(data: CreateTicketDto & { tenant_id: number }) {
    const { room_id } = data;
    const title = data.title || 'Báo cáo sự cố';
    if (!room_id) throw new BadRequestException('Thiếu Số phòng hoặc Tiêu đề sự cố.');

    const room = await this.roomRepository.findById(room_id);
    if (!room) throw new NotFoundException('Không tìm thấy phòng.');

    const mine = await this.contractRepository.findAll({ tenant_id: data.tenant_id, status: 'ACTIVE' });
    if (!mine.some((c: any) => Number(c.room_id) === Number(room_id))) {
      throw new ForbiddenException('Bạn chỉ có thể báo sự cố cho phòng mình đang thuê.');
    }

    return this.ticketRepository.create({
      room_id, tenant_id: data.tenant_id,
      title: String(title).slice(0, 255), description: data.description, image_url: data.image_url,
      severity: ['LOW', 'MEDIUM', 'HIGH'].includes(data.severity as string) ? data.severity : 'MEDIUM',
    });
  }

  list(filters: TicketQueryDto) {
    return this.ticketRepository.findAll(filters);
  }

  listMine(tenantId: number) {
    return this.ticketRepository.findByTenant(tenantId);
  }

  /** Admin xử lý sự cố: đổi trạng thái và/hoặc ghi chú phản hồi. */
  async handle(id: string, { status, admin_note }: UpdateTicketDto = {} as UpdateTicketDto) {
    const t = await this.ticketRepository.findById(id);
    if (!t) throw new NotFoundException('Không tìm thấy ticket.');
    const next = status === undefined ? t.status : status;
    if (!TICKET_STATUSES.includes(next)) throw new BadRequestException('Trạng thái không hợp lệ.');
    let note = t.admin_note;
    if (admin_note !== undefined) note = String(admin_note || '').trim().slice(0, 255) || null;
    let resolved_at = t.resolved_at;
    if (next === 'RESOLVED' && t.status !== 'RESOLVED') resolved_at = nowInAppTz();
    if (next !== 'RESOLVED') resolved_at = null;
    await this.ticketRepository.updateHandling(id, { status: next, admin_note: note, resolved_at });
  }
}
