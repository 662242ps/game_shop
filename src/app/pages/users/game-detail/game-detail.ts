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

  id       = signal<number>(0);
  loading  = signal<boolean>(true);
  errorMsg = signal<string | null>(null);

  game     = signal<GamesGetResponse | null>(null);

  cats        = signal<CatagoryGetResponse[]>([]);
  catsLoading = signal<boolean>(true);
  catsError   = signal<string | null>(null);

  // ป้าย "ขายดีอันดับ X" (รับจาก query ?rank=1)
  rank = signal<number>(0);

  // แปลง id -> ชื่อหมวด
  categoryName = computed(() => {
    const g = this.game(); if (!g) return '-';
    const m = this.cats().find(c => c.category_id === g.category_id);
    return m?.category_name ?? '-';
  });

  priceText = computed(() => {
    const n = Number(this.game()?.price ?? 0);
    return new Intl.NumberFormat('th-TH').format(n);
  });

  ngOnInit(): void {
    const rawId = Number(this.route.snapshot.paramMap.get('id'));
    this.id.set(rawId);

    // รับ rank จาก query param
    const r = Number(this.route.snapshot.queryParamMap.get('rank') ?? 0);
    this.rank.set(Number.isFinite(r) ? r : 0);

    this.loadCategories();
    this.fetch();
  }

  private loadCategories(): void {
    this.catsLoading.set(true);
    this.catsError.set(null);
    this.api.getAllCategories().subscribe({
      next: rows => this.cats.set(rows || []),
      error: e    => this.catsError.set(e?.message || 'โหลดประเภทเกมไม่สำเร็จ'),
      complete: () => this.catsLoading.set(false),
    });
  }

  private fetch(): void {
    this.loading.set(true);
    this.errorMsg.set(null);
    this.api.getGameById(this.id()).subscribe({
      next: (g) => this.game.set(g),
      error: (err) => {
        this.errorMsg.set(err?.message || 'ไม่พบข้อมูลเกม');
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }

  imgUrl(rel: string | null | undefined): string | null {
    return this.api.toAbsoluteUrl(rel ?? null);
  }

  goBack() { this.router.navigateByUrl('/user/shop'); }

  // เพิ่มลงตะกร้า (แบบเดียวกับหน้า shop)
  addToCart() {
    const g = this.game();
    if (!g) return;

    const me = this.api.getCurrentUser();
    if (!me?.id) {
      alert('โปรดเข้าสู่ระบบก่อนเพิ่มสินค้าในตะกร้า');
      return;
    }
    const body: CartPostRequest = {
      user_id: Number(me.id),
      game_id: Number(g.game_id),
      quantity: 1
    };
    this.api.cartAdd(body).subscribe({
      next: ()  => alert(`เพิ่ม "${g.name}" ลงตะกร้าแล้ว`),
      error: e  => alert(e?.message || 'เพิ่มลงตะกร้าไม่สำเร็จ')
    });
  }
}
