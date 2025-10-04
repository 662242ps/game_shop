export interface RegisterPostResponse {
  message: string;              // "User registered successfully"
  user_id: number;              // result.insertId
  profileimage: string | null;  // URL ที่อัปโหลดได้ หรือ null
}

/** force module (fix TS2306) */
export {};
