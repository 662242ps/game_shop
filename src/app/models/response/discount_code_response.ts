export interface DiscountCodeResponse {
  code_id:        number;
  code_name:      string;       // เช่น "GAME50"
  discount_value: number;       // เปอร์เซ็นต์ที่ลด เช่น 10
  max_usage:      number;       // ใช้ได้สูงสุดกี่ครั้ง
  condition:      number | null; // ขั้นต่ำต้องจ่าย (บาท) | null ได้
  created_at?:    string;       // เผื่อมีใน DB
  used_count?:    number;       // เผื่อมีใน DB
}
export {};
