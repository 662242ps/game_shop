import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';

import { HeaderComponent } from '../../header/header';
import { GameShopService } from '../../../services/api/game_shop.service';
import { GamesGetResponse } from '../../../models/response/games_get_response';
import { CatagoryGetResponse } from '../../../models/response/catagory_get_response';
import { GameRankingItem } from '../../../models/response/game_ranking_response'; // <-- ปรับ path ให้ตรงโปรเจกต์คุณ

// ใช้ร่วมได้ทั้งของ Top5 และของรายการทั้งหมด
type AdminListItem = {
  game_id: number;
  name?: string | null;
  image?: string | null;
  price?: string | number | null;
  category_id?: number | null;
};

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

  // Loading แยกส่วน
  loading    = signal(true);   // สำหรับ "เกมทั้งหมด"
  topLoading = signal(true);   // สำหรับ "5 เกมขายดี"
  error      = signal<string | null>(null);

  // ตัวกรอง (รูปแบบเดียวกับ usershop)
  q     = signal<string>('');
  catId = signal<number | null>(null);

  // ข้อมูล
  games = signal<GamesGetResponse[]>([]);

  // หมวดหมู่
  cats        = signal<CatagoryGetResponse[]>([]);
  catsLoading = signal<boolean>(true);

  // Top 5 จาก backend
  top5 = signal<GameRankingItem[]>([]);

  // กรองรายชื่อ “เกมทั้งหมด”
  filtered = computed(() => {
    const kw  = this.q().trim().toLowerCase();
    const cid = this.catId();
    return this.games().filter(g => {
      const okName =
        !kw ||
        (g.name ?? '').toLowerCase().includes(kw) ||
        String(g.price ?? '').includes(kw);
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
    // ===== โหลด Top 5 (ใช้เส้น /games/ranking)
    this.api.gameRankingUpdate().subscribe({
      next: rows => this.top5.set(rows ?? []),
      error: _err => { this.top5.set([]); this.topLoading.set(false); },
      complete: () => this.topLoading.set(false),
    });

    // ===== โหลด "เกมทั้งหมด"
    this.api.gamesGetAll().subscribe({
      next: rows => { this.games.set(rows || []); this.loading.set(false); },
      error: err  => { this.error.set(err?.message || 'โหลดข้อมูลไม่สำเร็จ'); this.loading.set(false); }
    });

    // ===== โหลดหมวดหมู่
    this.api.getAllCategories().subscribe({
      next: rows => this.cats.set(rows || []),
      error: _    => this.cats.set([]),
      complete: () => this.catsLoading.set(false),
    });
  }

  img(g: { image?: string | null }): string | null {
    const url = g?.image || '';
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url; // absolute (เช่น Cloudinary)
    return this.api.toAbsoluteUrl(url);        // relative → แปลงเป็น absolute
  }

  priceTHB(p: string | number | null | undefined): string {
    const n = Number(p ?? 0);
    return `฿${new Intl.NumberFormat('th-TH').format(n)}`;
  }



  edit(g: AdminListItem){ this.router.navigate(['/admin/edit-game', g.game_id]); }

  remove(g: AdminListItem){
    if (!confirm(`ยืนยันลบ "${g.name ?? 'เกมนี้'}" ?`)) return;

    // ลบออกจากรายการ games (ส่วน "เกมทั้งหมด") แบบ optimistic
    const before = this.games();
    const next   = before.filter(x => x.game_id !== g.game_id);
    this.games.set(next);

    this.api.deleteGame(Number(g.game_id)).subscribe({
      error: err => {
        alert(err?.message || 'ลบไม่สำเร็จ');
        this.games.set(before); // rollback
      }
    });
  }

  // ส่ง queryParams เฉพาะเมื่อมีอันดับจริง ๆ (1..5)
// --- เพิ่มใน Shop class ---
// ส่ง queryParams เฉพาะเมื่อมีอันดับจริง ๆ
getRankQP(item: any) {
  const r = Number(item?.ranking ?? item?.rank ?? item?.rank_position ?? item?.position);
  return Number.isFinite(r) && r > 0 ? { rank: r } : undefined;
}

// นำทางไปหน้า detail พร้อม rank ถ้ามี
goDetail(item: any) {
  const qp = this.getRankQP(item);
  if (qp) this.router.navigate(['/admin/game', item.game_id], { queryParams: qp });
  else    this.router.navigate(['/admin/game', item.game_id]);
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
