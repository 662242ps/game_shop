import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HeaderComponent } from '../../header/header';

import { GameShopService } from '../../../services/api/game_shop.service';
import { GamesGetResponse } from '../../../models/response/games_get_response';
import { CartPostRequest } from '../../../models/request/cart_post_request';
import { CatagoryGetResponse } from '../../../models/response/catagory_get_response';
import { GameRankingItem } from '../../../models/response/game_ranking_response';

type Cartable = {
  game_id: number;
  name?: string | null;
  image?: string | null;
  price?: string | number | null;
};

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HeaderComponent],
  templateUrl: './shop.html',
  styleUrls: ['./shop.scss']
})
export class Shop implements OnInit {
  private api    = inject(GameShopService);
  private router = inject(Router);

  loading    = signal(true);
  topLoading = signal(true);
  error      = signal<string | null>(null);

  q     = signal<string>('');
  catId = signal<number | null>(null);

  cats        = signal<CatagoryGetResponse[]>([]);
  catsLoading = signal<boolean>(true);

  games = signal<GamesGetResponse[]>([]);
  top5  = signal<GameRankingItem[]>([]);

  dlgOpen = signal(false);
  dlg     = signal<{ state: 'ok'|'error'; title: string; message: string }>({
    state: 'ok', title: '', message: ''
  });

  filtered = computed(() => {
    const kw  = this.q().trim().toLowerCase();
    const cat = this.catId();
    return this.games().filter(g => {
      const okName = !kw || (g.name ?? '').toLowerCase().includes(kw);
      const okCat  = !cat || Number(g.category_id) === Number(cat);
      return okName && okCat;
    });
  });

  get todayStr(): string {
    const d = new Date();
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  }

  ngOnInit(): void {
    this.api.gameRankingUpdate().subscribe({
      next: rows => this.top5.set(rows ?? []),
      error: _    => { this.top5.set([]); this.topLoading.set(false); },
      complete: () => this.topLoading.set(false),
    });

    this.api.gamesGetAll().subscribe({
      next: rows => { this.games.set(rows ?? []); this.loading.set(false); },
      error: err  => { this.error.set(String(err?.message || 'โหลดข้อมูลไม่สำเร็จ')); this.loading.set(false); }
    });

    this.api.getAllCategories().subscribe({
      next: rows => this.cats.set(rows || []),
      error: _   => this.cats.set([]),
      complete: () => this.catsLoading.set(false),
    });
  }

  // ===== Utils =====
  img(g: { image?: string | null }): string | null {
    const url = g?.image || '';
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;
    return this.api.toAbsoluteUrl(url);
  }

  priceTHB(p: string | number | null | undefined): string {
    const n = Number(p ?? 0);
    return `฿${new Intl.NumberFormat('th-TH').format(n)}`;
  }

  // ===== Rank helpers (เหมือนฝั่งแอดมิน) =====
  getRank(item: any): number | null {
    const r = Number(item?.ranking ?? item?.rank ?? item?.rank_position ?? item?.position);
    return Number.isFinite(r) && r > 0 ? r : null;
  }
  getRankQP(item: any) {
    const r = this.getRank(item);
    return r ? { rank: r } : undefined;
  }

  // ไปหน้ารายละเอียด พร้อมส่ง ?rank= ถ้ามี
  goDetail(item: Cartable & { ranking?: number | null }) {
    const qp = this.getRankQP(item);
    if (qp) this.router.navigate(['/user/game', item.game_id], { queryParams: qp });
    else    this.router.navigate(['/user/game', item.game_id]);
  }

  // ===== Cart =====
  add2Cart(g: Cartable) {
    const me = this.api.getCurrentUser();
    if (!me?.id) {
      return this.openDlg('error', 'โปรดเข้าสู่ระบบ', 'คุณต้องเข้าสู่ระบบก่อนเพิ่มสินค้าในตะกร้า');
    }
    const body: CartPostRequest = { user_id: Number(me.id), game_id: Number(g.game_id), quantity: 1 };
    this.api.cartAdd(body).subscribe({
      next: ()   => this.openDlg('ok', 'เพิ่มลงตะกร้าแล้ว', `${g?.name || 'เกมนี้'} ถูกเพิ่มในตะกร้า`),
      error: err => this.openDlg('error', 'เพิ่มลงตะกร้าไม่สำเร็จ', err?.message || 'ลองใหม่อีกครั้ง')
    });
  }

  // ===== Dialog =====
  openDlg(state: 'ok'|'error', title: string, message: string) {
    this.dlg.set({ state, title, message }); this.dlgOpen.set(true);
    setTimeout(() => document.getElementById('dlg-ok')?.focus(), 0);
  }
  closeDlg() { this.dlgOpen.set(false); }

  // ===== Select caret =====
  openCatPicker(selectEl: HTMLSelectElement) {
    if (!selectEl) return;
    selectEl.focus();
    try { const anySel = selectEl as any; if (typeof anySel.showPicker === 'function') { anySel.showPicker(); return; } } catch {}
    selectEl.click();
  }
  handleCaretKey(ev: KeyboardEvent, selectEl: HTMLSelectElement) {
    if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); this.openCatPicker(selectEl); }
  }
}
