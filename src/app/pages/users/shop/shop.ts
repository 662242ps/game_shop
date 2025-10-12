import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HeaderComponent } from '../../header/header';

import { GameShopService } from '../../../services/api/game_shop.service';
import { GamesGetResponse } from '../../../models/response/games_get_response';
import { CartPostRequest } from '../../../models/request/cart_post_request';
import { CatagoryGetResponse } from '../../../models/response/catagory_get_response';

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

  loading = signal(true);
  error   = signal<string | null>(null);

  // ตัวกรอง
  q     = signal<string>('');
  catId = signal<number | null>(null);

  // หมวดหมู่
  cats        = signal<CatagoryGetResponse[]>([]);
  catsLoading = signal<boolean>(true);

  // ข้อมูลเกม
  games = signal<GamesGetResponse[]>([]);

  // Dialog แจ้งเตือน
  dlgOpen = signal(false);
  dlg     = signal<{ state: 'ok'|'error'; title: string; message: string }>({
    state: 'ok', title: '', message: ''
  });

  // Top 5
  topSellers = computed(() => this.games().slice(0, 5));

  // ตัวกรองรวมชื่อ + ประเภท
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
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
  }

  ngOnInit(): void {
    // โหลดเกม
    this.api.gamesGetAll().subscribe({
      next: rows => { this.games.set(rows ?? []); this.loading.set(false); },
      error: err  => { this.error.set(String(err?.message || 'โหลดข้อมูลไม่สำเร็จ')); this.loading.set(false); }
    });

    // โหลดหมวดหมู่
    this.api.getAllCategories().subscribe({
      next: rows => this.cats.set(rows || []),
      error: _   => this.cats.set([]),
      complete: () => this.catsLoading.set(false),
    });
  }

  // ==== Utils ====
  img(g: GamesGetResponse): string | null {
    return this.api.toAbsoluteUrl(g.image || '');
  }

  priceTHB(p: string | number | null | undefined): string {
    const n = Number(p ?? 0);
    return `฿${new Intl.NumberFormat('th-TH').format(n)}`;
  }

  // เพิ่มลงตะกร้า (กันนำทางออกจากหน้าไว้ใน template)
  add2Cart(g: GamesGetResponse) {
    const me = this.api.getCurrentUser();
    if (!me?.id) {
      return this.openDlg('error', 'โปรดเข้าสู่ระบบ', 'คุณต้องเข้าสู่ระบบก่อนเพิ่มสินค้าในตะกร้า');
    }
    const body: CartPostRequest = {
      user_id: Number(me.id),
      game_id: Number(g.game_id),
      quantity: 1
    };
    this.api.cartAdd(body).subscribe({
      next: ()   => this.openDlg('ok', 'เพิ่มลงตะกร้าแล้ว', `${g.name} ถูกเพิ่มในตะกร้าเรียบร้อย`),
      error: err => this.openDlg('error', 'เพิ่มลงตะกร้าไม่สำเร็จ', err?.message || 'ลองใหม่อีกครั้ง')
    });
  }

  // ไปหน้ารายละเอียดเกม
  goDetail(id: number) {
    this.router.navigate(['/user/game', id]);
  }

  // Dialog helpers
  openDlg(state: 'ok'|'error', title: string, message: string) {
    this.dlg.set({ state, title, message });
    this.dlgOpen.set(true);
    setTimeout(() => document.getElementById('dlg-ok')?.focus(), 0);
  }
  closeDlg() { this.dlgOpen.set(false); }

  // เปิดตัวเลือกประเภทด้วยไอคอน caret
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
    selectEl.click();
  }
  handleCaretKey(ev: KeyboardEvent, selectEl: HTMLSelectElement) {
    const key = ev.key;
    if (key === 'Enter' || key === ' ') {
      ev.preventDefault();
      this.openCatPicker(selectEl);
    }
  }
}
