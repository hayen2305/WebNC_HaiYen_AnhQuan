import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthUser } from '../common/auth-user';
import { OcrService } from '../integrations/ocr.service';
import { SupportRepository } from './support.repository';

@Injectable()
export class SupportService {
  constructor(
    private readonly supportRepository: SupportRepository,
    private readonly ocrService: OcrService,
  ) {}

  history(userId: number) {
    return this.supportRepository.findRecentByUser(userId);
  }

  async ask(user: AuthUser, question: unknown) {
    const normalizedQuestion = String(question || '').trim();
    if (!normalizedQuestion) throw new BadRequestException('Vui lòng nhập câu hỏi.');
    if (normalizedQuestion.length > 2000) throw new BadRequestException('Câu hỏi không được dài quá 2.000 ký tự.');

    const history = await this.supportRepository.findRecentByUser(user.id);
    const answer = await this.ocrService.askAssistant(normalizedQuestion, history, {
      full_name: user.full_name,
      role: user.role,
    });
    const id = await this.supportRepository.create({ user_id: user.id, question: normalizedQuestion, answer });
    return { id, question: normalizedQuestion, answer, created_at: new Date().toISOString() };
  }
}
