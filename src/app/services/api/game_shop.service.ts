// src/app/services/api/game_shop.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of, map } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { Constants } from '../../pages/config/constants';
// เดิม
// ด้านบนไฟล์ game_shop.service.ts

// === Models ===
import { CreateGamePotsRequest } from '../../models/request/creategame_post_Request';
import { GamesGetResponse } from '../../models/response/games_get_response';
import { LoginPostRequest } from '../../models/request/login_post_request';
import { LoginPostResponse } from '../../models/response/login_post_response';
import { RegisterPostRequest } from '../../models/request/register_post_request';
import { RegisterPostResponse } from '../../models/response/register_post_response';
import { UserDetailResponse } from '../../models/response/user_detail_response';
import { UsersGetRespone } from '../../models/response/users_get_response';
import { WalletPotsRequest } from '../../models/request/wallet_pots_request';
import { WalletDepositGetResponse } from '../../models/response/walletdeposit_get_response';
import { WalletTxnGetResponse } from '../../models/response/wallettxn_get_response';
import { CartPostRequest } from '../../models/request/cart_post_request';
import { CartGetResponse } from '../../models/response/cart_get_response';
import { CatagoryGetResponse } from '../../models/response/catagory_get_response';
import { GameRankingItem } from '../../models/response/game_ranking_response';
import { MygamesGetResponse } from '../../models/response/mygames_get_response';
import { DiscountCodeResponse } from '../../models/response/discount_code_response';
import { DiscountCodeCreateRequest, DiscountCodeUpdateRequest } from '../../models/request/discount_code_request';

@Injectable({ providedIn: 'root' })
export class GameShopService {
  private http = inject(HttpClient);
  private constants = inject(Constants);

  /** API base (เช่น http://localhost:3000 หรือ https://api.example.com/api) */
  private base = this.constants.API_ENDPOINT.replace(/\/+$/, '');

  /** origin ชัวร์ ๆ (เช่น http://localhost:3000 หรือ https://api.example.com) */
  private readonly origin = (() => {
    try {
      return new URL(this.base).origin;
    } catch {
      // fallback กรณี base ไม่ใช่ URL สมบูรณ์: ตัด /api ออกแบบหยาบ ๆ
      return this.base.replace(/\/+$/, '').replace(/\/api(?=\/|$)/, '');
    }
  })();

  /** ใช้กับคำขอแบบ JSON เท่านั้น (เช่น login) */
  private json = new HttpHeaders({ 'Content-Type': 'application/json' });

  /** localStorage keys */
  private static readonly LS_USER  = 'gs_user';
  private static readonly LS_ROLE  = 'role';
  private static readonly LS_TOKEN = 'gs_token';

  // ===== Auth =====
  /**
   * POST /users/login
   * body: { email, password }
   * return: { id, username, email, role, wallet, profile_image?, token? }
   */
  login(payload: LoginPostRequest): Observable<LoginPostResponse> {
    const url = `${this.base}/users/login`;
    return this.http.post<LoginPostResponse>(url, payload, { headers: this.json }).pipe(
      tap((res: any) => {
        const role = String(res?.role || 'user').toLowerCase();

        const saveUser = {
          id:       res?.id ?? res?.user_id,
          username: res?.username ?? '',
          email:    res?.email ?? '',
          role,
          wallet:   res?.wallet ?? 0,
          profileimage: res?.profile_image ?? res?.profileimage ?? null,
        };

        localStorage.setItem(GameShopService.LS_USER, JSON.stringify(saveUser));
        localStorage.setItem(GameShopService.LS_ROLE, role);

        if (res?.token) localStorage.setItem(GameShopService.LS_TOKEN, String(res.token));
        else localStorage.removeItem(GameShopService.LS_TOKEN);
      }),
      catchError(this.handle)
    );
  }
  // … ในคลาส GameShopService เพิ่มเมทอดนี้
usersGetAll() {
  const url = `${this.base}/users`;
  return this.http.get<UsersGetRespone[]>(url).pipe(catchError(this.handle));
}


  /**
   * POST /users/register
   * ส่งเป็น multipart/form-data (แนบรูปในฟิลด์ profile_image)
   */
  register(payload: RegisterPostRequest): Observable<RegisterPostResponse> {
    const url = `${this.base}/users/register`;
    const fd = new FormData();
    fd.append('username', payload.username);
    fd.append('email', payload.email);
    fd.append('password', payload.password);
    if (payload.profile_image) fd.append('profile_image', payload.profile_image);
    return this.http.post<RegisterPostResponse>(url, fd).pipe(catchError(this.handle));
  }

  /** GET /users/:id */
  getUserById(id: number | string) {
    const url = `${this.base}/users/${id}`;
    return this.http.get<UserDetailResponse>(url).pipe(catchError(this.handle));
  }

  /** PUT /users/:id/update (แก้ไขโปรไฟล์) */
  updateUser(
    id: number | string,
    payload: FormData | { username?: string; profile_image?: File | null }
  ): Observable<UserDetailResponse> {
    const url = `${this.base}/users/${id}/update`;

    const body: FormData = payload instanceof FormData
      ? payload
      : (() => {
          const fd = new FormData();
          if (payload.username)      fd.append('username', payload.username);
          if (payload.profile_image) fd.append('profile_image', payload.profile_image);
          return fd;
        })();

    return this.http.put<UserDetailResponse>(url, body).pipe(
      tap((res: any) => {
        // อัปเดต gs_user ใน localStorage ให้ทันสมัย
        const raw = localStorage.getItem(GameShopService.LS_USER);
        if (!raw) return;
        try {
          const cur = JSON.parse(raw);
          const updated = {
            ...cur,
            username: res?.username ?? (body.get('username') as string) ?? cur.username,
            profileimage: res?.profile_image ?? cur.profileimage ?? null,
          };
          localStorage.setItem(GameShopService.LS_USER, JSON.stringify(updated));
        } catch { /* ignore */ }
      }),
      catchError(this.handle)
    );
  }

  // ===== Games =====
  /** GET /games – ดึงรายการเกมทั้งหมด */
  gamesGetAll(): Observable<GamesGetResponse[]> {
    const url = `${this.base}/games`; // ถ้า BE เป็น /api/games ให้แก้ให้ตรง
    return this.http.get<GamesGetResponse[]>(url).pipe(catchError(this.handle));
  }

  /**
   * ✅ แปลง path รูปจาก API ให้เป็น URL สมบูรณ์:
   * - ถ้าได้ URL เต็มมาแล้ว (http/https/data/blob) จะคืนค่าเดิม
   * - ถ้าได้เป็น path (เช่น uploads/xxx.jpg หรือ /uploads/xxx.jpg)
   *   จะประกอบกับ origin ของ API (ตัด /api ออกให้เอง) → http(s)://host/uploads/xxx.jpg
   */
  toAbsoluteUrl(p?: string | null): string | null {
  if (!p) return null;
  // ปรับ \ -> / กันเคส Windows และ trim
  let s = String(p).trim().replace(/\\/g, '/');
  if (!s) return null;

  // ถ้าเป็น URL เต็ม/ data/blob อยู่แล้ว → ใช้เลย
  if (/^(https?:)?\/\//i.test(s) || s.startsWith('data:') || s.startsWith('blob:')) {
    return s;
  }

  // ตัด prefix ที่ไม่ต้องการ และลบ / นำหน้า
  s = s.replace(/^\/+/, '')
       .replace(/^public\//, '')
       .replace(/^api\//, '');

  return `${this.origin}/${s}`;
}


  // ===== Session helpers =====
  logout(): void {
    localStorage.removeItem(GameShopService.LS_USER);
    localStorage.removeItem(GameShopService.LS_ROLE);
    localStorage.removeItem(GameShopService.LS_TOKEN);
  }

  getCurrentUser(): any | null {
    const raw = localStorage.getItem(GameShopService.LS_USER);
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem(GameShopService.LS_TOKEN) || !!this.getCurrentUser();
  }

  // ===== Error handler =====
  private handle(err: any) {
    const message =
      (typeof err?.error === 'string' && err.error) ||
      err?.error?.error ||
      err?.error?.message ||
      err?.message ||
      'Request failed';
    return throwError(() => new Error(message));
  }
   gamesCreate(body: CreateGamePotsRequest, file: File) {
    const url = `${this.base}/games`; // ถ้า BE เป็น /api/games ให้แก้ให้ตรง

    // เติม created_by จาก session หากยังไม่ถูกตั้งมา
    const current = this.getCurrentUser();
    const createdBy = body.created_by ?? current?.id;
    if (!createdBy) {
      return throwError(() => new Error('ไม่พบผู้ใช้ (created_by)'));
    }

    // ประกอบ form-data ให้ตรงกับ multer.single('image')
    const fd = new FormData();
    fd.append('name',        body.name);
    fd.append('price',       String(body.price));
    // แบ็กเอนด์ใช้ (description || null) → ส่ง '' ได้ จะกลายเป็น null ฝั่งเซิร์ฟเวอร์
    fd.append('description', (body.description as any) ?? '');
    fd.append('category_id', String(body.category_id));
    fd.append('created_by',  String(createdBy));
    fd.append('image',       file);                 // ⬅️ ต้องชื่อ 'image' เท่านั้น

    // ไม่ต้อง set Content-Type เอง ให้ browser ใส่ boundary
    return this.http.post<any>(url, fd).pipe(catchError(this.handle));
  }
  updateGame(
  id: number | string,
  body: Partial<Pick<CreateGamePotsRequest, 'name' | 'price' | 'description' | 'category_id'>> & {
    image?: File | null;
  }
) {
  // เส้นตามสไตล์โปรเจกต์นี้ให้ใช้ /games/:id/update (เหมือน users)
  const url = `${this.base}/games/${id}/update`;

  const fd = new FormData();
  if (body.name        !== undefined) fd.append('name',        String(body.name));
  if (body.price       !== undefined) fd.append('price',       String(body.price));
  if (body.description !== undefined) fd.append('description', body.description as any ?? '');
  if (body.category_id !== undefined) fd.append('category_id', String(body.category_id));
  if (body.image)                      fd.append('image',      body.image); // multer.single('image')

  return this.http.put<any>(url, fd).pipe(catchError(this.handle));
}

// == DELETE ==
deleteGame(id: number | string) {
  const url = `${this.base}/games/${id}`;
  return this.http.delete<{ message: string; game_id: number | string }>(url)
    .pipe(catchError(this.handle));
}
getGameById(id: number | string) {
  const url = `${this.base}/games/${id}`;
  return this.http.get<GamesGetResponse>(url).pipe(catchError(this.handle));
}

// ===== Wallet (ตามเส้น API ฝั่ง BE) =====

/** POST /users/:id/wallet/deposit  body: { amount } */
walletDeposit(userId: number | string, payload: WalletPotsRequest) {
  const url = `${this.base}/users/deposit/${userId}`;
  return this.http.post<WalletDepositGetResponse>(url, payload, { headers: this.json }).pipe(
    // อัปเดต wallet ใน localStorage ให้ UI สดใหม่ (ออปชันนัล)
    tap(res => {
      const raw = localStorage.getItem(GameShopService.LS_USER);
      if (!raw) return;
      try {
        const me = JSON.parse(raw);
        const wallet = Number(me?.wallet ?? 0) + Number(res?.amount ?? 0);
        localStorage.setItem(GameShopService.LS_USER, JSON.stringify({ ...me, wallet }));
      } catch { /* ignore */ }
    }),
    catchError(this.handle)
  );
}


/** GET /users/transaction/:id → ประวัติธุรกรรม */
walletGetTransactions(userId: number | string) {
  const url = `${this.base}/users/transaction/${userId}`;
  return this.http.get<WalletTxnGetResponse[]>(url, { headers: this.json })
    .pipe(catchError(this.handle));
}


/** (ออปชันนัล) GET /users/:id → ดึงข้อมูลผู้ใช้เพื่อนำ wallet_balance ไปใช้ */
walletGetBalance(userId: number | string) {
  // คืน UserDetailResponse ทั้งก้อน แล้วให้ component หยิบ u.wallet_balance / u.wallet ไปใช้เอง
  const url = `${this.base}/users/${userId}`;
  return this.http.get<UserDetailResponse>(url).pipe(catchError(this.handle));
}

/** GET /users/cartitemall/:id → รายการในตะกร้า */
  cartGet(userId: number | string) {
  const url = `${this.base}/users/cartitemall/${userId}`;
  return this.http.get<CartGetResponse>(url)
    .pipe(catchError(this.handle));
}

  /** POST /users/cartitem/add → เพิ่มเกมลงตะกร้า */
  cartAdd(payload: CartPostRequest) {
    const url = `${this.base}/users/cartitem/add`;
    return this.http.post<{
      message: string;
      cart_id: number;
      game_id: number;
      quantity: number;
    }>(url, payload, { headers: this.json }).pipe(catchError(this.handle));
  }

  /** ดึง 5 เกมขายดีจากแบ็กเอนด์ (เส้นจริงเป็น GET /games/ranking) */
  gameRankingUpdate(): Observable<GameRankingItem[]> {
    return this.http
      .get<{ message: string; top5: GameRankingItem[] }>(`${this.base}/games/ranking`)
      .pipe(map(res => res?.top5 ?? []));
  }

  /** DELETE /users/cartitem/remove → ลบเกมออกจากตะกร้า (body: { user_id, game_id }) */
  cartRemove(payload: Pick<CartPostRequest, 'user_id' | 'game_id'>) {
    const url = `${this.base}/users/cartitem/remove`;
    return this.http.request<{ message: string; cart_id: number; game_id: number }>(
      'DELETE', url, { body: payload, headers: this.json }
    ).pipe(catchError(this.handle));
  }

  // game_shop.service.ts
cartPurchase(userId: number | string, discount?: number | string | null) {
  const url = `${this.base}/users/cartitem/buy`;
  const body: any = { user_id: Number(userId) };

  // รองรับส่งเป็น code_id (number) หรือ code_name (string)
  if (typeof discount === 'number' && Number.isFinite(discount)) {
    body.discount_code_id = Number(discount);
  } else if (typeof discount === 'string' && discount.trim()) {
    body.discount_code = discount.trim();
  }

  return this.http.post<{
    message: string;
    user_id: number;
    original_cart_total?: number;
    discount_applied?: number;
    charged_total?: number;
    remaining_balance?: number;
    used_code?: string | null;
    purchased_games?: string[];
  }>(url, body, { headers: this.json }).pipe(catchError(this.handle));
}

  

  getAllCategories(): Observable<CatagoryGetResponse[]> {
  const url = `${this.base}/users/catagory`;
  return this.http.get<CatagoryGetResponse[]>(url).pipe(
    catchError((err) => {
      if (err?.status === 404) return of<CatagoryGetResponse[]>([]);
      return this.handle(err);
    })
  );
}

myLibraryGet(userId: number): Observable<MygamesGetResponse[]> {
  // ให้แน่ใจว่า base ชี้ไปโดเมนถูก และมี /api ข้างหน้าเสมอ
  return this.http
    .get<{ message: string; user_id: number; total_games: number; games: MygamesGetResponse[] }>(
      `${this.base}/games/library/${userId}`
    )
    .pipe(map(res => res?.games ?? []));
}

// ===== Discount APIs =====
getAllDiscountCodes(): Observable<DiscountCodeResponse[]> {
  const url = `${this.base}/games/getallcode`;
  return this.http.get<DiscountCodeResponse[]>(url).pipe(catchError(this.handle));
}

createDiscountCode(body: DiscountCodeCreateRequest): Observable<{ message: string; code_id: number }> {
  const url = `${this.base}/games/createcode`;
  return this.http.post<{ message: string; code_id: number }>(url, body, { headers: this.json })
    .pipe(catchError(this.handle));
}

updateDiscountCode(id: number, body: DiscountCodeUpdateRequest): Observable<{ message: string }> {
  const url = `${this.base}/games/editcode/${id}`;
  return this.http.put<{ message: string }>(url, body, { headers: this.json })
    .pipe(catchError(this.handle));
}

deleteDiscountCode(id: number): Observable<{ message: string }> {
  const url = `${this.base}/games/deletecode/${id}`;
  return this.http.delete<{ message: string }>(url)
    .pipe(catchError(this.handle));
}


}
