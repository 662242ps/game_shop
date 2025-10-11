import { Component, OnInit, inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { HeaderComponent } from '../../header/header';
import { GameShopService } from '../../../services/api/game_shop.service';
import { UserDetailResponse } from '../../../models/response/user_detail_response';

@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, HeaderComponent],
  templateUrl: './profile-edit.html',
  styleUrls: ['./profile-edit.scss'],
})
export class ProfileEditComponent implements OnInit {
  private api = inject(GameShopService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  userId!: number | string;

  loading = true;
  saving = false;
  errorMsg = '';

  // รูปปัจจุบัน/พรีวิว
  currentImageUrl: string | null = null;
  newFile?: File;
  newPreviewUrl?: string;

  readonly MAX_MB = 5;

  form = this.fb.group({
    username: ['', [Validators.required, Validators.maxLength(50)]],
    profile_image: [null as File | null], // เก็บไฟล์ (ไม่ต้องผูก UI)
  });

  ngOnInit(): void {
    const u = this.api.getCurrentUser();
    if (!u?.id) {
      this.router.navigateByUrl('/login');
      return;
    }

    this.userId = u.id;
    this.form.patchValue({ username: u.username || '' });
    this.currentImageUrl = (u as any).profileimage ?? (u as any).profile_image ?? null;
    this.loading = false;
  }

  /** เปิด dialog เลือกรูปจากการคลิกการ์ดรูป */
  triggerPick() {
    this.fileInput?.nativeElement?.click();
  }

  /** เลือกไฟล์: แสดงเฉพาะพรีวิว ยังไม่อัปเดตจริง */
  onFileChange(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      this.discardNewImage();
      return;
    }

    // ตรวจชนิด/ขนาด
    if (!file.type.startsWith('image/')) {
      this.errorMsg = 'กรุณาเลือกเป็นไฟล์รูปภาพเท่านั้น';
      this.discardNewImage();
      return;
    }
    if (file.size > this.MAX_MB * 1024 * 1024) {
      this.errorMsg = `ไฟล์ใหญ่เกินไป (เกิน ${this.MAX_MB}MB)`;
      this.discardNewImage();
      return;
    }

    this.newFile = file;
    this.form.patchValue({ profile_image: file });
    this.errorMsg = '';

    // ทำพรีวิว (ยังไม่ส่งขึ้นเซิร์ฟเวอร์)
    const reader = new FileReader();
    reader.onload = () => (this.newPreviewUrl = reader.result as string);
    reader.readAsDataURL(file);
  }

  /** ยกเลิกรูปใหม่: กลับไปใช้รูปเดิม */
  discardNewImage() {
    this.newFile = undefined;
       this.newPreviewUrl = undefined;
    this.form.patchValue({ profile_image: null });
    this.resetFileInput();
  }

  private resetFileInput() {
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  /** บันทึก: ค่อยอัปโหลดจริง แล้วค่อยเปลี่ยนรูปถาวร */
  async onSubmit() {
    if (this.form.invalid || this.saving) return;

    this.saving = true;
    this.errorMsg = '';

    try {
      const fd = new FormData();
      fd.append('username', this.form.value.username?.trim() || '');
      if (this.newFile) fd.append('profile_image', this.newFile);

      const res: UserDetailResponse = await firstValueFrom(
        this.api.updateUser(this.userId, fd)
      );

      // อัปเดต session ฝั่ง client (ถ้ามีเมธอด)
      try {
        const me = this.api.getCurrentUser() ?? {};
        const updated = {
          ...me,
          username: (res as any).username ?? this.form.value.username,
          profileimage: (res as any).profileimage ?? (res as any).profile_image ?? me['profileimage'] ?? me['profile_image'],
          profile_image: (res as any).profile_image ?? (res as any).profileimage ?? me['profile_image'] ?? me['profileimage'],
        };
        (this.api as any).setCurrentUser?.(updated);
      } catch { /* ข้ามถ้า service ไม่มี */ }

      // เคลียร์สถานะพรีวิว
      this.discardNewImage();

      // กลับหน้าโปรไฟล์
      this.router.navigateByUrl('/user/profile');
    } catch (err: any) {
      this.errorMsg = err?.message || 'บันทึกการเปลี่ยนแปลงไม่สำเร็จ';
    } finally {
      this.saving = false;
    }
  }
}
