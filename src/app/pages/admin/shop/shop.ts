import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';

import { HeaderComponent } from '../../header/header';
import { GameShopService } from '../../../services/api/game_shop.service';
import { GamesGetResponse } from '../../../models/response/games_get_response';
import { CatagoryGetResponse } from '../../../models/response/catagory_get_response';

type GameItem = {
  id: number;
  name: string;
  price: number;
  cover: string | null;
  category_id: number | null;
};

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HeaderComponent, RouterLink],
  templateUrl: './shop.html',
  styleUrls: ['./shop.scss']
})
export class Shop implements OnInit {
  private api = inject(GameShopService);
  private sanitizer = inject(DomSanitizer);
  private router = inject(Router);

  // ค้นหาคำ
  query   = signal<string>('');
  // ประเภทที่เลือก (null = ทั้งหมด)
  catId   = signal<number | null>(null);

  loading = signal<boolean>(true);
  error   = signal<string | null>(null);

  games   = signal<GameItem[]>([]);
  deletingId = signal<number | null>(null);

  // หมวดหมู่
  cats         = signal<CatagoryGetResponse[]>([]);
  catsLoading  = signal<boolean>(false);

  total = computed(() => this.games().length);

  // กรองทั้งชื่อ/ราคา + หมวดหมู่
  filtered = computed(() => {
    const q = (this.query() ?? '').trim().toLowerCase();
    const cid = this.catId();
    return this.games().filter(g => {
      const matchQ = !q || g.name.toLowerCase().includes(q) || String(g.price).includes(q);
      const matchC = cid == null || g.category_id === cid;
      return matchQ && matchC;
    });
  });

  ngOnInit(): void {
    this.fetchGames();
    this.fetchCategories();
  }

  private fetchGames(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.gamesGetAll().subscribe({
      next: (rows: GamesGetResponse[]) => {
        const list: GameItem[] = rows.map(r => ({
          id:    r.game_id,
          name:  r.name,
          price: Number(r.price ?? 0),
          cover: this.api.toAbsoluteUrl(r.image),
          // ต้องมี field นี้ใน GamesGetResponse (มีอยู่ในโปรเจกต์คุณ)
          category_id: (r as any).category_id ?? null,
        }));
        this.games.set(list);
      },
      error: (err: any) => this.error.set(err?.message || 'โหลดข้อมูลไม่สำเร็จ'),
      complete: () => this.loading.set(false),
    });
  }

  private fetchCategories(): void {
    this.catsLoading.set(true);
    this.api.getAllCategories().subscribe({
      next: rows => this.cats.set(rows ?? []),
      error: () => this.cats.set([]),
      complete: () => this.catsLoading.set(false),
    });
  }

  /** background: url(...) center/cover no-repeat, gradient */
  bgStyle(urlOrNull: string | null): SafeStyle {
    const grad = 'linear-gradient(180deg, rgba(198,241,255,.10), rgba(7,4,16,.40))';
    if (!urlOrNull) return this.sanitizer.bypassSecurityTrustStyle(grad);
    return this.sanitizer.bypassSecurityTrustStyle(`url("${urlOrNull}") center / cover no-repeat, ${grad}`);
  }

  /** ไปหน้าแก้ไข */
  edit(g: GameItem) {
    this.router.navigate(['/admin/edit-game', g.id]);
  }

  /** ลบเกม (ยืนยันก่อน) */
  remove(g: GameItem) {
    if (this.deletingId()) return;
    if (!confirm(`ยืนยันลบ "${g.name}" ?`)) return;

    this.deletingId.set(g.id);

    // optimistic UI
    const before = this.games();
    this.games.set(before.filter(x => x.id !== g.id));

    this.api.deleteGame(g.id).subscribe({
      next: () => {},
      error: (err: any) => {
        alert(err?.message || 'ลบไม่สำเร็จ');
        this.games.set(before);
      },
      complete: () => this.deletingId.set(null),
    });
  }

  trackById = (_: number, g: GameItem) => g.id;

  // ====== เปิดเมนู select ด้วยไอคอน caret ======
  openCatPicker(selectEl: HTMLSelectElement) {
    if (!selectEl) return;
    selectEl.focus();
    try {
      const anySel = selectEl as any;
      if (typeof anySel.showPicker === 'function') {
        anySel.showPicker();
        return;
      }
    } catch {}
    selectEl.click(); // fallback
  }

  handleCaretKey(ev: KeyboardEvent, selectEl: HTMLSelectElement) {
    const k = ev.key;
    if (k === 'Enter' || k === ' ') {
      ev.preventDefault();
      this.openCatPicker(selectEl);
    }
  }
}
