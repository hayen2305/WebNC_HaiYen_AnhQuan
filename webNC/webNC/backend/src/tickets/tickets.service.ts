import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CloudinaryService } from '../integrations/cloudinary.service';
import { IssueAnalysis, OcrService } from '../integrations/ocr.service';
import { RoomRepository } from '../rooms/room.repository';
import { CreateTicketDto, TicketQueryDto } from './dto/ticket.dto';
import { TicketRepository } from './ticket.repository';

const TICKET_STATUSES = ['PENDING', 'IN_PROGRESS', 'RESOLVED'];

@Injectable()
export class TicketsService {
  constructor(
    private readonly ticketRepository: TicketRepository,
    private readonly roomRepository: RoomRepository,
    private readonly cloudinaryService: CloudinaryService,
    private readonly ocrService: OcrService,
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

  async create(data: CreateTicketDto & { tenant_id: number; tenant_name: string }) {
    const { room_id } = data;
    const title = data.title || 'Báo cáo sự cố';
    if (!room_id) throw new BadRequestException('Thiếu Số phòng hoặc Tiêu đề sự cố.');

    const room = await this.roomRepository.findById(room_id);
    if (!room) throw new NotFoundException('Không tìm thấy phòng.');

    return this.ticketRepository.create({
      room_id, tenant_id: data.tenant_id, room_number: room.room_number, tenant_name: data.tenant_name,
      title, description: data.description, image_url: data.image_url, severity: data.severity,
    });
  }

  list(filters: TicketQueryDto) {
    return this.ticketRepository.findAll(filters);
  }

  async updateStatus(id: string, status: string) {
    if (!TICKET_STATUSES.includes(status)) throw new BadRequestException('Trạng thái không hợp lệ.');
    const affected = await this.ticketRepository.updateStatus(id, status);
    if (affected === 0) throw new NotFoundException('Không tìm thấy ticket.');
  }
}
