import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';

import { HeaderComponent } from '../../header/header';
import { GameShopService } from '../../../services/api/game_shop.service';
import { GamesGetResponse } from '../../../models/response/games_get_response';
import { CatagoryGetResponse } from '../../../models/response/catagory_get_response';

@Component({
  selector: 'app-admin-game-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent],
  templateUrl: './game-detail.html',
  styleUrls: ['./game-detail.scss'],
})
export class AdminGameDetailComponent implements OnInit {
  private api   = inject(GameShopService);
  private route = inject(ActivatedRoute);
  private router= inject(Router);

  id       = signal<number>(0);
  loading  = signal<boolean>(true);
  errorMsg = signal<string | null>(null);

  game     = signal<GamesGetResponse | null>(null);
  cats        = signal<CatagoryGetResponse[]>([]);
  catsLoading = signal<boolean>(true);

  // ⭐ ป้าย "ขายดีอันดับ X"
  rank = signal<number>(0);

  categoryName = computed(() => {
    const g = this.game(); if (!g) return '';
    const m = this.cats().find(c => c.category_id === g.category_id);
    return m?.category_name ?? '';
  });

  priceText = computed(() => new Intl.NumberFormat('th-TH').format(Number(this.game()?.price ?? 0)));

  ngOnInit(): void {
    this.id.set(Number(this.route.snapshot.paramMap.get('id')));

    // รับจาก query param (มากดจาก Top5/รายการ)
    const qp = Number(this.route.snapshot.queryParamMap.get('rank'));
    if (Number.isFinite(qp) && qp > 0) this.rank.set(qp);

    // หมวดหมู่
    this.api.getAllCategories().subscribe({
      next: rows => this.cats.set(rows || []),
      error: _ => this.cats.set([]),
      complete: () => this.catsLoading.set(false),
    });

    this.fetch();
  }

  private fetch(): void {
    this.loading.set(true);
    this.errorMsg.set(null);

    // ใช้เส้นเดิมของคุณ
    this.api.getGameById(this.id()).subscribe({
      next: (g) => {
        this.game.set(g);

        // ⭐ ถ้า API ของ getGameById ส่ง ranking มาด้วย ให้ใช้ค่านั้นแทน
        const apiRank = Number(g?.ranking);
        if (Number.isFinite(apiRank) && apiRank >= 1 && apiRank <= 5) {
          this.rank.set(apiRank);
        }
      },
      error: err => this.errorMsg.set(err?.message || 'ไม่พบข้อมูลเกม'),
      complete: () => this.loading.set(false)
    });
  }

  imgUrl(rel: string | null | undefined): string | null {
    return this.api.toAbsoluteUrl(rel ?? null);
  }

  remove() {
    const g = this.game(); if (!g) return;
    if (!confirm(`ยืนยันลบเกม "${g.name}" หรือไม่?`)) return;

    this.api.deleteGame(this.id()).subscribe({
      next: () => this.router.navigateByUrl('/admin/shop'),
      error: (e) => alert(e?.message || 'ลบไม่สำเร็จ')
    });
  }

  edit() { this.router.navigate(['/admin/edit-game', this.id()]); }
  backToShop() { this.router.navigateByUrl('/admin/shop'); }
}
