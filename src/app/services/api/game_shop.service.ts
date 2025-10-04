// src/app/services/api/game_shop.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { Constants } from '../../pages/config/constants';

// === Models ===
import { LoginPostRequest } from '../../models/request/login_post_request';
import { LoginPostResponse } from '../../models/response/login_post_response';
import { RegisterPostRequest } from '../../models/request/register_post_request';
import { RegisterPostResponse } from '../../models/response/register_post_response';
import { UserDetailResponse } from '../../models/response/user_detail_response';

@Injectable({ providedIn: 'root' })
export class GameShopService {
  private http = inject(HttpClient);
  private constants = inject(Constants);

  /** API base: ตัด / ท้ายออกเพื่อกัน // ซ้อน */
  private base = this.constants.API_ENDPOINT.replace(/\/+$/, '');

  /** ใช้กับคำขอแบบ JSON เท่านั้น (เช่น login) */
  private json = new HttpHeaders({ 'Content-Type': 'application/json' });

  /** localStorage keys */
  private static readonly LS_USER  = 'gs_user';
  private static readonly LS_ROLE  = 'role';
  private static readonly LS_TOKEN = 'gs_token';

  /**
   * POST /users/login
   * body: { email, password } (JSON)
   * return: { id, username, email, role, wallet, ... , token? }
   * → เซฟ session ลง localStorage ให้ header/โปรไฟล์ใช้งานได้ทันที
   */
  login(payload: LoginPostRequest): Observable<LoginPostResponse> {
    const url = `${this.base}/users/login`;
    return this.http.post<LoginPostResponse>(url, payload, { headers: this.json }).pipe(
      tap((res: any) => {
        const role = String(res?.role || 'user').toLowerCase();

        // map ให้อยู่รูปแบบเดียวกับที่ FE ใช้ใน header/profile
        const saveUser = {
          id: res?.id ?? res?.user_id,
          username: res?.username ?? '',
          email: res?.email ?? '',
          role,
          wallet: res?.wallet ?? 0,
          profileimage: res?.profile_image ?? res?.profileimage ?? null,
        };

        localStorage.setItem(GameShopService.LS_USER, JSON.stringify(saveUser));
        localStorage.setItem(GameShopService.LS_ROLE, role);

        // ถ้า API ส่ง token มาก็บันทึกไว้ (ถ้าไม่ส่งก็ข้าม)
        if (res?.token) {
          localStorage.setItem(GameShopService.LS_TOKEN, String(res.token));
        } else {
          localStorage.removeItem(GameShopService.LS_TOKEN);
        }
      }),
      catchError(this.handle)
    );
  }

  /**
   * POST /users/register
   * ส่งเป็น multipart/form-data (แนบรูปผ่านฟิลด์ profile_image)
   * - ห้ามตั้ง Content-Type เอง ให้เบราว์เซอร์ตั้ง boundary ให้
   */
  register(payload: RegisterPostRequest): Observable<RegisterPostResponse> {
    const url = `${this.base}/users/register`;
    const fd = new FormData();
    fd.append('username', payload.username);
    fd.append('email', payload.email);
    fd.append('password', payload.password);
    if (payload.profile_image) {
      fd.append('profile_image', payload.profile_image);
    }
    return this.http.post<RegisterPostResponse>(url, fd).pipe(catchError(this.handle));
  }

  /** GET /users/:id */
  getUserById(id: number | string) {
    const url = `${this.base}/users/${id}`;
    return this.http.get<UserDetailResponse>(url).pipe(catchError(this.handle));
  }

  /** PUT /users/:id/update  (แก้ไขโปรไฟล์) */
  updateUser(
    id: number | string,
    payload: FormData | { username?: string; profile_image?: File | null }
  ): Observable<UserDetailResponse> {
    const url = `${this.base}/users/${id}/update`;

    // แปลงเป็น FormData หากยังไม่ใช่
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
        // API ตอบ { message, user_id, username, profile_image }
        // → อัปเดต gs_user ใน localStorage
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
}
