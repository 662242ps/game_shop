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

  // ป้าย "ขายดีอันดับ X" (รับจาก query ?rank=1)
  rank = signal<number>(0);

  categoryName = computed(() => {
    const g = this.game(); if (!g) return '';
    const m = this.cats().find(c => c.category_id === g.category_id);
    return m?.category_name ?? '';
  });

  priceText = computed(() => {
    const n = Number(this.game()?.price ?? 0);
    return new Intl.NumberFormat('th-TH').format(n);
  });

  ngOnInit(): void {
    this.id.set(Number(this.route.snapshot.paramMap.get('id')));
    const r = Number(this.route.snapshot.queryParamMap.get('rank') ?? 0);
    this.rank.set(Number.isFinite(r) ? r : 0);

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
    this.api.getGameById(this.id()).subscribe({
      next: g => this.game.set(g),
      error: err => {
        this.errorMsg.set(err?.message || 'ไม่พบข้อมูลเกม');
        this.loading.set(false);
      },
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

  edit() {
    // ปรับ path ให้ตรงกับโปรเจกต์คุณ หากหน้าแก้ไขคือ /admin/edit-game/:id
    this.router.navigate(['/admin/edit-game', this.id()]);
  }

  backToShop() {
    this.router.navigateByUrl('/admin/shop');
  }
}
