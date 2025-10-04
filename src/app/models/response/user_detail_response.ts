export interface UserDetailResponse {
  user_id: number;
  username: string;
  email: string;
  profile_image: string | null;
  wallet_balance: number; // ถ้า backend ส่งเป็น string ให้เปลี่ยนเป็น string
  role: string;           // 'admin' | 'user'
}

/** force module (fix TS2306) */
export {};