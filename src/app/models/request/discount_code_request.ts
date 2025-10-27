export interface DiscountCodeCreateRequest {
  code_name:      string;
  discount_value: number;
  max_usage:      number;
  condition?:     number | null; // ขั้นต่ำต้องจ่าย (บาท)
}

export interface DiscountCodeUpdateRequest extends DiscountCodeCreateRequest {}
export {};
