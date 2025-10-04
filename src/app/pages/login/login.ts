// src/app/pages/login/login.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { GameShopService } from '../../services/api/game_shop.service';
import { LoginPostRequest } from '../../models/request/login_post_request';
import { LoginPostResponse } from '../../models/response/login_post_response';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login {
  private fb = inject(FormBuilder);
  private api = inject(GameShopService);
  private router = inject(Router);

  loading = false;
  errorMsg = '';

  // ใช้ nonNullable เพื่อลด error ชนิด string | null
  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(4)]],
  });

  get f() { return this.form.controls; }

  onSubmit() {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.errorMsg = '';

    const payload: LoginPostRequest = this.form.getRawValue();

    this.api.login(payload).subscribe({
      next: (res: LoginPostResponse) => {
        // เก็บข้อมูลไว้ใช้ภายหลัง
        localStorage.setItem('gs_user', JSON.stringify(res));
        localStorage.setItem('role', String(res.role || 'user'));

        // ไปตาม role → /admin/shop หรือ /user/shop
        const target = this.landingRoute(res.role);
        this.router.navigateByUrl(target);
      },
      error: (err) => {
        this.errorMsg = err?.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
        this.loading = false;
      },
      complete: () => (this.loading = false),
    });
  }

  /** map role -> path */
  private landingRoute(role: unknown): string {
    const r = String(role ?? '').toLowerCase().trim();
    return r === 'admin' ? '/admin/shop' : '/user/shop';
  }
}
