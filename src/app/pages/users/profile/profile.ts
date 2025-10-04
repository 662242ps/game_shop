import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HeaderComponent } from '../../header/header';
import { GameShopService } from '../../../services/api/game_shop.service';
import { UserDetailResponse } from '../../../models/response/user_detail_response';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss'],
})
export class ProfileComponent implements OnInit {
  private api = inject(GameShopService);
  private router = inject(Router);

  loading = true;
  errorMsg = '';
  user?: UserDetailResponse;

  ngOnInit(): void {
    // อ่าน id จาก localStorage (ตอน login เราเก็บทั้ง res ไว้ใน gs_user)
    const raw = localStorage.getItem('gs_user');
    let id: number | string | null = null;
    try {
      const u = raw ? JSON.parse(raw) : null;
      id = u?.id ?? u?.user_id ?? null;
    } catch { /* ignore */ }

    if (!id) {
      // ไม่พบผู้ใช้ → ให้กลับไปหน้า login
      this.router.navigateByUrl('/login');
      return;
    }

    this.api.getUserById(id).subscribe({
      next: (res) => {
        this.user = {
          ...res,
          // ป้องกัน null/undefined บางกรณี
          profile_image: res.profile_image ?? null,
        };
      },
      error: (err) => {
        this.errorMsg = err?.message || 'โหลดข้อมูลผู้ใช้ไม่สำเร็จ';
        this.loading = false;
      },
      complete: () => (this.loading = false),
    });
  }

  /** ตัวอักษรขึ้นต้นสำหรับอวตาร fallback */
  get avatarInitial(): string {
    const n = (this.user?.username || this.user?.email || 'U').toString().trim();
    return (n.charAt(0) || 'U').toUpperCase();
  }

  logout() {
    localStorage.removeItem('gs_user');
    localStorage.removeItem('role');
    this.router.navigateByUrl('/login');
  }
}
