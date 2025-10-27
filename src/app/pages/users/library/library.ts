import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';   // ⬅️ เพิ่ม
import { HeaderComponent } from '../../header/header';

import { GameShopService } from '../../../services/api/game_shop.service';
import { MygamesGetResponse } from '../../../models/response/mygames_get_response';
import { finalize } from 'rxjs';

type OwnedGame = { id: number; title: string; cover: string };

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HeaderComponent], // ⬅️ เพิ่ม RouterModule
  templateUrl: './library.html',
  styleUrls: ['./library.scss'],
})
export class Library implements OnInit {
  private api = inject(GameShopService);
  private router = inject(Router); // ⬅️ เพิ่ม

  q          = signal<string>('');
  loading    = signal<boolean>(true);
  error      = signal<string | null>(null);
  games      = signal<OwnedGame[]>([]);
  ownedTotal = signal<number>(0);

  ngOnInit(): void {
    const me = this.api.getCurrentUser?.();
    const userId = Number(me?.id);

    if (!userId) {
      this.loading.set(false);
      this.error.set('โปรดเข้าสู่ระบบก่อนดูคลังเกม');
      return;
    }

    this.api.myLibraryGet(userId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (rows: MygamesGetResponse[]) => {
          this.ownedTotal.set(rows.length);
          this.games.set(rows.map(r => ({
            id: r.game_id,
            title: r.name,
            cover: this.makeImg(r.image),
          })));
        },
        error: err => this.error.set(String(err?.message || 'โหลดข้อมูลไม่สำเร็จ')),
      });
  }

  private makeImg(url: string): string {
    const u = (url || '').trim();
    if (!u) return '';
    if (/^https?:\/\//i.test(u)) return u;
    const sep = u.startsWith('/') ? '' : '/';
    return `${location.origin}${sep}${u}`;
  }

  filteredGames = computed<OwnedGame[]>(() => {
    const k = this.q().trim().toLowerCase();
    const list = this.games();
    return !k ? list : list.filter(g => (g.title || '').toLowerCase().includes(k));
  });

  trackByGame = (_: number, g: OwnedGame) => g.id;

  // ⬅️ ฟังก์ชันนำทางไปหน้ารายละเอียด
  goDetail(id: number) {
    if (!id) return;
    this.router.navigate(['/user/game', id]);
  }
}
