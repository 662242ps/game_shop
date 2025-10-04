/** ใช้ส่ง multipart/form-data ไปที่ /users/register */
export interface RegisterPostRequest {
  username: string;
  email: string;
  password: string;
  /** แนบไฟล์รูปโปรไฟล์; ไม่บังคับ */
  profile_image?: File | null;
}

/** force module (fix TS2306) */
export {};
