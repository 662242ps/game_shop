import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { GameShopService } from '../../../services/api/game_shop.service';
import { RegisterPostRequest } from '../../../models/request/register_post_request';
import { RegisterPostResponse } from '../../../models/response/register_post_response';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './signup.html',
  styleUrls: ['./signup.scss'],
})
export class Signup {
  private fb = inject(FormBuilder);
  private api = inject(GameShopService);
  private router = inject(Router);

  /** preview สำหรับรูปโปรไฟล์ที่ผู้ใช้เลือก */
  avatarPreview: string | null = null;
  /** เก็บไฟล์จริงไว้ส่ง backend */
  private avatarFile: File | null = null;

  loading = false;
  errorMsg = '';
  okMsg = '';

  form = this.fb.group(
    {
      username: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(4)]],
      confirm: ['', [Validators.required]],
    },
    { validators: [passwordsMatch] }
  );

  /** ช็อตคัตไปยัง controls */
  get f() { return this.form.controls; }

  /** true เมื่อ password/confirm ไม่ตรงกัน */
  get passwordsNotMatch(): boolean {
    return !!this.form.errors?.['passwordsNotMatch'] && (this.f.confirm.touched || this.f.confirm.dirty);
  }

  /** อัปเดตรูปจาก <input type="file"> */
  onFileSelected(e: Event) {
    this.errorMsg = '';
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // ตรวจชนิด/ขนาดเบื้องต้น (backend limit 10MB)
    if (!file.type.startsWith('image/')) {
      this.errorMsg = 'กรุณาเลือกรูปภาพเท่านั้น';
      input.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.errorMsg = 'ไฟล์รูปใหญ่เกิน 10MB';
      input.value = '';
      return;
    }

    this.avatarFile = file;

    const reader = new FileReader();
    reader.onload = () => (this.avatarPreview = reader.result as string);
    reader.readAsDataURL(file);

    // ล้างค่า input เพื่อให้เลือกไฟล์เดิมซ้ำได้
    input.value = '';
  }

  onSubmit() {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMsg = '';
    this.okMsg = '';

    const { username, email, password } = this.form.getRawValue();

    const payload: RegisterPostRequest = {
      username: String(username),
      email: String(email),
      password: String(password),
      profile_image: this.avatarFile ?? undefined, // ถ้าไม่มีรูป ไม่ต้องส่งฟิลด์นี้ก็ได้
    };

    this.api.register(payload).subscribe({
      next: (res: RegisterPostResponse) => {
        this.okMsg = 'สมัครสมาชิกสำเร็จ! กำลังพาไปหน้าเข้าสู่ระบบ…';
        // ให้ผู้ใช้เห็นข้อความสักครู่ แล้วพาไป /login
        setTimeout(() => this.router.navigateByUrl('/login'), 800);
      },
      error: (err) => {
        // backend อาจส่งเป็น string ตรง ๆ เช่น "Email already exists"
        this.errorMsg = (err?.message ?? 'สมัครสมาชิกไม่สำเร็จ').toString();
        this.loading = false;
      },
      complete: () => (this.loading = false),
    });
  }
}

/** ตรวจสอบให้ password และ confirm ตรงกัน */
export function passwordsMatch(group: AbstractControl) {
  const p = group.get('password')?.value;
  const c = group.get('confirm')?.value;
  return p && c && p === c ? null : { passwordsNotMatch: true };
}
