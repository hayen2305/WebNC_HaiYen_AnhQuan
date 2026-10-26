import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger, NotFoundException } from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Bộ lọc lỗi tập trung — giữ nguyên định dạng response cũ của Express: { message: string }.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = 500;
    let message = 'Lỗi máy chủ không xác định.';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      const raw = typeof body === 'string' ? body : (body as any).message;
      message = Array.isArray(raw) ? raw.join(', ') : raw || exception.message;

      if (exception instanceof NotFoundException && /^Cannot /.test(message)) {
        message = `Không tìm thấy route: ${req.method} ${req.originalUrl}`;
      }
    } else {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
      if (exception instanceof Error && exception.message) message = exception.message;
    }

    res.status(status).json({ message });
  }
}
