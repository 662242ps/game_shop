export interface LoginPostResponse {
  id: number;
  username: string;
  email: string;
  role: string;
  wallet: string;      // ถ้า API ส่งตัวเลข ให้เปลี่ยนเป็น number
  hasImage: boolean;
  message: string;
}

/** บังคับให้ไฟล์นี้เป็นโมดูล (แก้ TS2306) */
export {};
