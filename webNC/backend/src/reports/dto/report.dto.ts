export class ReportQueryDto {
  /** YYYY-MM-DD */
  from?: string;
  to?: string;
  /** paid = theo ngày thực thu; period = theo kỳ hóa đơn */
  basis?: 'paid' | 'period';
  group?: 'day' | 'month';
}
