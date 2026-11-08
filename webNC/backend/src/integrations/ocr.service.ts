import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface BillAmounts {
  /** Tiền điện phải thanh toán (VNĐ) */
  electricity_amount: number | string | null;
  /** Tiền nước phải thanh toán (VNĐ) */
  water_amount: number | string | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  raw_text: string;
}

export interface IssueAnalysis {
  device_type: string;
  issue_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  title: string;
  summary_vi: string;
  is_safety_risk: boolean;
  immediate_actions: string[];
  should_call_landlord_urgently: boolean;
}

export interface ChatHistoryItem {
  question: string;
  answer: string;
}

/**
 * OCRService — tích hợp Gemini / OpenAI Vision API.
 * Ưu tiên Gemini nếu có GEMINI_API_KEY, fallback sang OpenAI nếu có OPENAI_API_KEY.
 * Use-case: (1) đọc chỉ số điện/nước từ ảnh/PDF, (2) phân tích ảnh sự cố, (3) trợ lý hỏi đáp.
 */
@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private readonly geminiApiKey?: string;
  private readonly openaiApiKey?: string;
  private readonly geminiModel: string;
  private readonly maxOutputTokens: number;

  constructor(config: ConfigService) {
    this.geminiApiKey = config.get('GEMINI_API_KEY') || undefined;
    this.openaiApiKey = config.get('OPENAI_API_KEY') || undefined;
    this.geminiModel = config.get('GEMINI_MODEL') || 'gemini-3.6-flash';
    // Giới hạn token đầu ra của trợ lý. Model dạng "thinking" tính cả token suy luận vào đây nên cần để rộng.
    this.maxOutputTokens = Number(config.get('AI_MAX_OUTPUT_TOKENS')) || 4096;
  }

  getProvider(): 'gemini' | 'openai' | null {
    if (this.geminiApiKey) return 'gemini';
    if (this.openaiApiKey) return 'openai';
    return null;
  }

  private get geminiUrl() {
    return `https://generativelanguage.googleapis.com/v1beta/models/${this.geminiModel}:generateContent?key=${this.geminiApiKey}`;
  }

  /** Gọi model Vision, ép trả JSON thuần. */
  private async callVisionJSON<T>(imageBase64: string, mimeType: string, prompt: string): Promise<T> {
    const provider = this.getProvider();
    if (!provider) {
      throw new Error('Chưa cấu hình GEMINI_API_KEY hoặc OPENAI_API_KEY — không thể gọi OCRService.');
    }

    const fullPrompt = `${prompt}\nCHỈ trả về một JSON object hợp lệ, không kèm markdown, không có lời giải thích, không có dấu backtick.`;

    if (provider === 'gemini') {
      const { data } = await axios.post(this.geminiUrl, {
        contents: [{ parts: [{ text: fullPrompt }, { inline_data: { mime_type: mimeType, data: imageBase64 } }] }],
        generationConfig: { response_mime_type: 'application/json' },
      });
      return this.safeParseJSON<T>(data.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
    }

    const { data } = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: fullPrompt },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          ],
        }],
      },
      { headers: { Authorization: `Bearer ${this.openaiApiKey}` } },
    );
    return this.safeParseJSON<T>(data.choices?.[0]?.message?.content || '{}');
  }

  private safeParseJSON<T>(text: string): T {
    try {
      return JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch {
      throw new Error('AI trả về dữ liệu không đúng định dạng JSON: ' + text.slice(0, 200));
    }
  }

  /** Trợ lý hỏi đáp cho tenant/admin. */
  async askAssistant(
    question: string,
    history: ChatHistoryItem[] = [],
    context: Record<string, unknown> = {},
  ): Promise<string> {
    const provider = this.getProvider();
    if (!provider) {
      throw new Error('Chưa cấu hình GEMINI_API_KEY hoặc OPENAI_API_KEY — không thể gọi trợ lý.');
    }

    const historyText = history.length === 0
      ? 'Chưa có lịch sử trò chuyện.'
      : history.map((item) => `Người dùng: ${item.question}\nTrợ lý: ${item.answer}`).join('\n');
    const prompt = `Bạn là trợ lý hỗ trợ quản lý nhà trọ tại Việt Nam.
Chỉ trả lời các câu hỏi liên quan đến thuê phòng, hợp đồng, hóa đơn, thanh toán, nội quy,
bảo trì và báo sự cố. Trả lời bằng tiếng Việt, ngắn gọn, thực tế và dễ hiểu.
Không tự bịa thông tin tài khoản, số tiền, ngày hạn hoặc chính sách cụ thể nếu không có trong ngữ cảnh.
Nếu câu hỏi cần chủ trọ xác nhận, hãy nói rõ người dùng nên liên hệ chủ trọ.

Thông tin người dùng hiện tại: ${JSON.stringify(context)}
Lịch sử gần đây:
${historyText}

Câu hỏi mới: ${question}`;

    const fallback = 'Xin lỗi, trợ lý chưa có câu trả lời.';
    if (provider === 'gemini') {
      const { data } = await axios.post(this.geminiUrl, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: this.maxOutputTokens },
      });
      const candidate = data.candidates?.[0];
      if (candidate?.finishReason === 'MAX_TOKENS') {
        this.logger.warn(`Gemini bị cắt do chạm giới hạn ${this.maxOutputTokens} token (tăng AI_MAX_OUTPUT_TOKENS nếu cần).`);
      }
      // Ghép mọi phần text (model có thể trả nhiều part), bỏ các part "thought" nếu có.
      const text = (candidate?.content?.parts || [])
        .filter((part: any) => !part.thought && typeof part.text === 'string')
        .map((part: any) => part.text)
        .join('')
        .trim();
      return text || fallback;
    }

    const { data } = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      { model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: this.maxOutputTokens },
      { headers: { Authorization: `Bearer ${this.openaiApiKey}` } },
    );
    if (data.choices?.[0]?.finish_reason === 'length') {
      this.logger.warn(`OpenAI bị cắt do chạm giới hạn ${this.maxOutputTokens} token (tăng AI_MAX_OUTPUT_TOKENS nếu cần).`);
    }
    return data.choices?.[0]?.message?.content?.trim() || fallback;
  }

  /** Bóc tách SỐ TIỀN điện/nước phải thanh toán từ ảnh/PDF hóa đơn điện nước gốc. */
  extractBillAmounts(imageBase64: string, mimeType: string): Promise<BillAmounts> {
    const prompt = `Bạn là hệ thống OCR đọc HÓA ĐƠN TIỀN ĐIỆN / TIỀN NƯỚC tại Việt Nam.
Hãy đọc ảnh/tài liệu được đính kèm và trả về JSON theo đúng schema sau:
{
  "electricity_amount": số tiền điện phải thanh toán (VNĐ, số nguyên, không có dấu chấm/phẩy ngăn cách) hoặc null,
  "water_amount": số tiền nước phải thanh toán (VNĐ, số nguyên, không có dấu chấm/phẩy ngăn cách) hoặc null,
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "raw_text": "toàn bộ text nhận diện được từ ảnh, để chủ trọ đối chiếu thủ công nếu cần"
}
Chỉ lấy SỐ TIỀN phải thanh toán (tổng cộng, đã gồm thuế/phí nếu có). KHÔNG lấy chỉ số công tơ hay lượng tiêu thụ (kWh, m3).
Nếu ảnh chỉ có 1 trong 2 loại hóa đơn, hoặc không thấy số tiền, để giá trị tương ứng là null.`;
    return this.callVisionJSON<BillAmounts>(imageBase64, mimeType, prompt);
  }

  /** Phân tích ảnh sự cố: phân loại + hướng dẫn xử lý tạm thời an toàn cho khách thuê. */
  analyzeIssueImage(imageBase64: string, mimeType: string): Promise<IssueAnalysis> {
    const prompt = `Bạn là kỹ thuật viên bảo trì nhà trọ giàu kinh nghiệm tại Việt Nam, đang tư vấn trực tiếp
cho một khách thuê không rành kỹ thuật. Họ vừa gửi ảnh sự cố và cần được GIÚP ĐỠ ngay, không chỉ là phân loại.

Hãy phân tích ảnh sự cố thiết bị/hạ tầng và trả về JSON theo đúng schema sau:
{
  "device_type": "loại thiết bị/hạng mục bị hỏng, ví dụ: Máy lạnh, Vòi nước, Ổ điện, Cửa, Trần nhà...",
  "issue_type": "mô tả ngắn gọn loại sự cố, ví dụ: Rò rỉ nước, Không lên nguồn, Nứt vỡ...",
  "severity": "LOW" hoặc "MEDIUM" hoặc "HIGH" (HIGH nếu có nguy cơ cháy nổ/chập điện/ngập nước/mất an toàn),
  "title": "tiêu đề ngắn gọn cho ticket, dưới 60 ký tự",
  "summary_vi": "mô tả chi tiết bằng tiếng Việt những gì quan sát được từ ảnh",
  "is_safety_risk": true hoặc false (true nếu khách thuê có thể gặp nguy hiểm nếu tiếp tục sử dụng/không xử lý ngay),
  "immediate_actions": [
    "Danh sách 2-4 bước CỤ THỂ khách thuê có thể tự làm NGAY bây giờ để giảm thiểu rủi ro hoặc hạn chế hư hỏng lan rộng,
     trong lúc chờ thợ tới. Ví dụ: 'Tắt cầu dao khu vực này ngay lập tức', 'Đặt xô hứng nước dưới chỗ rò rỉ',
     'Không chạm vào thiết bị khi tay còn ướt'. Nếu sự cố không có gì khách tự làm được, để mảng rỗng []."
  ],
  "should_call_landlord_urgently": true hoặc false (true nếu đây là tình huống khẩn cấp cần gọi ngay chủ trọ thay vì chỉ gửi ticket)
}

QUAN TRỌNG: "immediate_actions" phải là hướng dẫn AN TOÀN, không yêu cầu khách thuê tự sửa chữa điện nước
phức tạp hoặc tháo lắp thiết bị — chỉ là các bước tạm thời để giảm thiệt hại/rủi ro trong lúc chờ xử lý chuyên nghiệp.`;
    return this.callVisionJSON<IssueAnalysis>(imageBase64, mimeType, prompt);
  }
}
