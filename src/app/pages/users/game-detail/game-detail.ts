import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';

import { HeaderComponent } from '../../header/header';
import { GameShopService } from '../../../services/api/game_shop.service';
import { GamesGetResponse } from '../../../models/response/games_get_response';
import { CatagoryGetResponse } from '../../../models/response/catagory_get_response';
import { CartPostRequest } from '../../../models/request/cart_post_request';

@Component({
  selector: 'app-game-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent],
  templateUrl: './game-detail.html',
  styleUrls: ['./game-detail.scss'],
})
export class GameDetailComponent implements OnInit {
  private api   = inject(GameShopService);
  private route = inject(ActivatedRoute);
  private router= inject(Router);

  // ----- state -----
  id       = signal<number>(0);
  loading  = signal<boolean>(true);
  errorMsg = signal<string | null>(null);

  game     = signal<GamesGetResponse | null>(null);

  cats        = signal<CatagoryGetResponse[]>([]);
  catsLoading = signal<boolean>(true);
  catsError   = signal<string | null>(null);

  // ป้าย “ขายดีอันดับ X”
  rank = signal<number>(0);

  // ซ่อนปุ่มเพิ่มลงตะกร้าเมื่อมาจาก library
  from = signal<string>('');

  showAddBtn = computed(() => this.from() !== 'library');

  // ----- derived -----
  categoryName = computed(() => {
    const g = this.game(); if (!g) return '-';
    const m = this.cats().find(c => Number(c.category_id) === Number(g.category_id));
    return m ? m.category_name : '-';
  });

  priceText = computed(() => {
    const g = this.game();
    const n = g ? Number(g.price) : 0;
    return new Intl.NumberFormat('th-TH').format(n);
  });

  // ===== lifecycle =====
  ngOnInit(): void {
  this.id.set(Number(this.route.snapshot.paramMap.get('id')) || 0);
  // รับค่าแหล่งที่มา
  const f = this.route.snapshot.queryParamMap.get('from');
  this.from.set(f || '');

  this.loadCategories();
  this.fetchGame();
  this.refreshRankById(); // เช็คอันดับสด
}

  // ===== data fetchers =====
  private loadCategories(): void {
    this.catsLoading.set(true);
    this.catsError.set(null);
    this.api.getAllCategories().subscribe({
      next: rows => this.cats.set(rows || []),
      error: e    => this.catsError.set(e && e.message ? e.message : 'โหลดประเภทเกมไม่สำเร็จ'),
      complete: () => this.catsLoading.set(false),
    });
  }

  private fetchGame(): void {
    this.loading.set(true);
    this.errorMsg.set(null);
    this.api.getGameById(this.id()).subscribe({
      next: (g) => {
        this.game.set(g);

        // fallback: ถ้า backend แนบอันดับมากับตัวเกม ให้ลองอ่านก่อน
        const n = this.pickRank(g as any);
        if (n > 0) this.rank.set(n);
      },
      error: (err) => {
        this.errorMsg.set(err && err.message ? err.message : 'ไม่พบข้อมูลเกม');
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }

  /** ✅ ดึง Top5 ล่าสุด แล้วหาอันดับของเกมนี้ ถ้าไม่ติดให้เป็น 0 (ไม่แสดง) */
  private refreshRankById(): void {
    this.api.gameRankingUpdate().subscribe({
      next: (rows) => {
        const list = rows || [];
        const me   = list.find((r: any) => Number(r?.game_id) === this.id());
        const n    = me ? this.pickRank(me) : 0;
        this.rank.set(n > 0 ? n : 0);
      },
      error: () => this.rank.set(0),
    });
  }

  // ===== utils =====
  /** รองรับหลายชื่อฟิลด์จาก backend: ranking | rank | rank_position */
  private pickRank(x: any): number {
    const cand = [x && x.ranking, x && x.rank, x && x.rank_position];
    for (const v of cand) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return 0;
  }

  imgUrl(rel: string | null | undefined): string | null {
    return this.api.toAbsoluteUrl(rel != null ? rel : null);
  }

  goBack() { this.router.navigateByUrl('/user/shop'); }

  addToCart() {
    if (!this.showAddBtn()) return; // กันเผื่อถูกเรียกตอนมาจาก library
    const g = this.game(); if (!g) return;

    const me = this.api.getCurrentUser();
    if (!me || !me.id) { alert('โปรดเข้าสู่ระบบก่อนเพิ่มสินค้าในตะกร้า'); return; }

    const body: CartPostRequest = {
      user_id: Number(me.id),
      game_id: Number(g.game_id),
      quantity: 1
    };
    this.api.cartAdd(body).subscribe({
      next: ()  => alert(`เพิ่ม "${g.name}" ลงตะกร้าแล้ว`),
      error: e  => alert(e && e.message ? e.message : 'เพิ่มลงตะกร้าไม่สำเร็จ')
    });
  }
}
