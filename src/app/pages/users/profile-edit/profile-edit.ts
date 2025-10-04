// src/app/pages/users/profile-edit/profile-edit.ts
import { Component, OnInit, inject } from '@angular/core';
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

  userId!: number | string;

  loading = true;
  saving = false;
  errorMsg = '';

  // รูปปัจจุบัน/พรีวิว
  currentImageUrl: string | null = null;
  newFile?: File;
  newPreviewUrl?: string;

  form = this.fb.group({
    username: ['', [Validators.required, Validators.maxLength(50)]],
    // ใช้ไว้เก็บไฟล์ (ไม่จำเป็นต้อง bind ในเทมเพลตก็ได้)
    profile_image: [null as File | null],
  });

  ngOnInit(): void {
    // โหลดจาก session (gs_user) เพื่อได้ id/ค่าเริ่มต้น
    const u = this.api.getCurrentUser();
    if (!u?.id) {
      this.router.navigateByUrl('/login');
      return;
    }

    this.userId = u.id;
    this.form.patchValue({ username: u.username || '' });
    this.currentImageUrl = u.profileimage ?? u.profile_image ?? null;

    this.loading = false;
  }

  onFileChange(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      this.newFile = undefined;
      this.newPreviewUrl = undefined;
      this.form.patchValue({ profile_image: null });
      return;
    }

    this.newFile = file;
    this.form.patchValue({ profile_image: file });

    // ทำพรีวิว
    const reader = new FileReader();
    reader.onload = () => (this.newPreviewUrl = reader.result as string);
    reader.readAsDataURL(file);
  }

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

      // อัปเดตหน้า/นำทางกลับโปรไฟล์
      this.router.navigateByUrl('/user/profile');
    } catch (err: any) {
      this.errorMsg = err?.message || 'บันทึกการเปลี่ยนแปลงไม่สำเร็จ';
    } finally {
      this.saving = false;
    }
  }
}
