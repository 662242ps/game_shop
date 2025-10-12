import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';

import { HeaderComponent } from '../../header/header';
import { GameShopService } from '../../../services/api/game_shop.service';
import { GamesGetResponse } from '../../../models/response/games_get_response';
import { CatagoryGetResponse } from '../../../models/response/catagory_get_response';

@Component({
  selector: 'app-shop-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HeaderComponent],
  templateUrl: './shop.html',
  styleUrls: ['./shop.scss']
})
export class Shop implements OnInit {
  private api = inject(GameShopService);
  private router = inject(Router);

  loading = signal(true);
  error   = signal<string | null>(null);

  // ตัวกรอง (รูปแบบเดียวกับ usershop)
  q     = signal<string>('');
  catId = signal<number | null>(null);

  // ข้อมูล
  games = signal<GamesGetResponse[]>([]);

  // หมวดหมู่
  cats        = signal<CatagoryGetResponse[]>([]);
  catsLoading = signal<boolean>(true);

  // Top 5 / กรอง
  topSellers = computed(() => this.games().slice(0, 5));
  filtered   = computed(() => {
    const kw  = this.q().trim().toLowerCase();
    const cid = this.catId();
    return this.games().filter(g => {
      const okName = !kw || (g.name ?? '').toLowerCase().includes(kw) || String(g.price ?? '').includes(kw);
      const okCat  = !cid || Number(g.category_id) === Number(cid);
      return okName && okCat;
    });
  });

  get todayStr(): string {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
  }

  ngOnInit(): void {
    // โหลดเกม
    this.api.gamesGetAll().subscribe({
      next: rows => { this.games.set(rows || []); this.loading.set(false); },
      error: err  => { this.error.set(err?.message || 'โหลดข้อมูลไม่สำเร็จ'); this.loading.set(false); }
    });

    // โหลดหมวดหมู่
    this.api.getAllCategories().subscribe({
      next: rows => this.cats.set(rows || []),
      error: _    => this.cats.set([]),
      complete: () => this.catsLoading.set(false),
    });
  }

  img(g: GamesGetResponse): string | null {
    return this.api.toAbsoluteUrl(g.image || '');
  }

  priceTHB(p: string | number | null | undefined): string {
    const n = Number(p ?? 0);
    return `฿${new Intl.NumberFormat('th-TH').format(n)}`;
  }

  goDetail(id: number){ this.router.navigate(['/admin/game', id]); }
  edit(g: GamesGetResponse){ this.router.navigate(['/admin/edit-game', g.game_id]); }

  remove(g: GamesGetResponse){
    if (!confirm(`ยืนยันลบ "${g.name}" ?`)) return;
    const before = this.games();
    this.games.set(before.filter(x => x.game_id !== g.game_id));

    this.api.deleteGame(Number(g.game_id)).subscribe({
      error: err => {
        alert(err?.message || 'ลบไม่สำเร็จ');
        this.games.set(before);
      }
    });
  }

  // เปิดเมนู select ด้วย caret
  openCatPicker(selectEl: HTMLSelectElement) {
    if (!selectEl) return;
    selectEl.focus();
    try {
      const anySel = selectEl as any;
      if (typeof anySel.showPicker === 'function') { anySel.showPicker(); return; }
    } catch {}
    selectEl.click();
  }
  handleCaretKey(ev: KeyboardEvent, selectEl: HTMLSelectElement) {
    if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); this.openCatPicker(selectEl); }
  }
}
