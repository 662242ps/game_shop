import { Component, inject, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';              // ⬅️ เพิ่ม
import { HeaderComponent } from '../../header/header';
import { GameShopService } from '../../../services/api/game_shop.service';

// ใช้โมเดลจากไฟล์
import { UsersGetRespone } from '../../../models/response/users_get_response';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HeaderComponent], // ⬅️ เพิ่ม RouterModule
  templateUrl: './users.html',
  styleUrl: './users.scss'
})
export class AdminUsersPage implements OnInit {
  private api = inject(GameShopService);

  loading = signal<boolean>(true);
  error   = signal<string | null>(null);
  q       = signal<string>('');

  users   = signal<UsersGetRespone[]>([]);

  filtered = computed(() => {
    const kw = this.q().trim().toLowerCase();
    if (!kw) return this.users();
    return this.users().filter(u =>
      (u.username ?? '').toLowerCase().includes(kw) ||
      (u.email ?? '').toLowerCase().includes(kw)
    );
  });

  ngOnInit(): void {
    this.api.usersGetAll().subscribe({
      next: rows => { this.users.set(rows ?? []); this.loading.set(false); },
      error: err => { this.error.set(String(err?.message || 'โหลดข้อมูลไม่สำเร็จ')); this.loading.set(false); }
    });
  }

  avatar(u: UsersGetRespone): string | null {
    const url = this.api.toAbsoluteUrl((u as any).profile_image || '');
    return url || null;
  }

  onImgError(e: Event) {
    const el = e.target as HTMLImageElement;
    el.style.display = 'none';
    el.closest('.avatar-wrap')?.classList.add('no-img');
  }

  /** รองรับ id ได้ทั้ง user_id | id */
  userId(u: UsersGetRespone): number | string {
    return (u as any).user_id ?? (u as any).id ?? '';
  }
}
