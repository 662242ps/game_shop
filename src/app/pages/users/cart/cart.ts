// src/app/pages/users/cart/cart.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';           // ⬅️ ใช้ ngModel
import { RouterModule, Router } from '@angular/router';
import { HeaderComponent } from '../../header/header';
import { GameShopService } from '../../../services/api/game_shop.service';
import { CartGetResponse } from '../../../models/response/cart_get_response';
import { DiscountCodeResponse } from '../../../models/response/discount_code_response';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HeaderComponent],
  templateUrl: './cart.html',
  styleUrls: ['./cart.scss'],
})
export class Cart implements OnInit {
  private api = inject(GameShopService);
  private router = inject(Router);
   onCodeChange(v: any) {
    if (v === '' || v === null || v === 'null' || typeof v === 'undefined') {
      this.selectedCodeId.set(null);
      return;
    }
    const n = Number(v);
    this.selectedCodeId.set(Number.isFinite(n) ? n : null);
  }
  userId!: number;

  // UI state
  loading = signal<boolean>(true);
  working = signal<boolean>(false);
  error   = signal<string | null>(null);

  // สินค้าในตะกร้า
  items  = signal<any[]>([]);
  count  = computed(() => this.items().reduce((s, i) => s + this.getQty(i), 0));
  subtotal = computed(() =>
  this.items().reduce((s, it) => s + this.getTotal(it), 0)
);


  // โค้ดส่วนลด (ใช้ getAllDiscountCodes ตาม service ที่คุณมี)
  codes = signal<DiscountCodeResponse[]>([]);
  selectedCodeId = signal<number | null>(null);
  selectedCode = computed<DiscountCodeResponse | null>(() => {
    const id = this.selectedCodeId();
    if (id == null) return null;
    return this.codes().find(c => Number(c.code_id) === Number(id)) ?? null;
  });

  // เงื่อนไขขั้นต่ำ + ส่วนลดคาดการณ์ (เพื่อแสดงผลลัพธ์ล่วงหน้าเท่านั้น)
  meetsMin = computed(() => {
    const code = this.selectedCode();
    const min  = Number(code?.condition ?? 0);
    return this.subtotal() >= min;
  });
  estDiscount = computed(() => {
    const code = this.selectedCode();
    if (!code) return 0;
    if (!this.meetsMin()) return 0;
    const pct = Math.max(0, Number(code.discount_value) || 0) / 100;
    return Math.round(this.subtotal() * pct * 100) / 100;
  });
  payable = computed(() => {
    const pay = this.subtotal() - this.estDiscount();
    return pay < 0 ? 0 : pay;
  });

  ngOnInit(): void {
    const me = this.api.getCurrentUser();
    if (!me?.id) { this.router.navigate(['/login']); return; }
    this.userId = Number(me.id);

    this.loadCart();

    // โหลดรายการโค้ดทั้งหมด (ถ้ามีเส้น /availablecode/:id ก็สลับมาใช้ได้)
    this.api.getAllDiscountCodes().subscribe({
      next: rows => this.codes.set(rows || []),
      error: _ => this.codes.set([]),
    });
  }

  private loadCart() {
    this.loading.set(true);
    this.error.set(null);
    this.api.cartGet(this.userId).subscribe({
      next: (res: CartGetResponse) => {
        this.items.set(Array.isArray(res?.items) ? res.items : []);
        this.loading.set(false);
      },
      error: err => { this.error.set(err?.message ?? 'โหลดตะกร้าไม่สำเร็จ'); this.loading.set(false); }
    });
  }

  // ===== Helpers =====
  imgUrlFromItem(it: any): string | null {
    const raw = it?.image ?? it?.img ?? it?.cover ?? it?.thumbnail ?? null;
    return raw ? (this.api.toAbsoluteUrl(raw) || null) : null;
  }
  imgUrl(p?: string | null): string | null { return this.api.toAbsoluteUrl(p || '') || null; }
  getName(it: any): string { return String(it?.game_name ?? it?.name ?? it?.title ?? ''); }
  getPrice(it: any): number { return Number(it?.price ?? 0); }
  getQty(it: any): number { return Number(it?.quantity ?? it?.qty ?? 0); }
  getTotal(it: any): number {
    const tot = it?.total_price ?? it?.total ?? null;
    return tot != null ? Number(tot) : (this.getPrice(it) * this.getQty(it));
  }
  getGameId(it: any): number { return Number(it?.game_id ?? it?.id ?? 0); }

  // ===== Actions =====
  remove(it: any) {
    if (this.working()) return;
    const gid = this.getGameId(it);
    if (!gid) { this.error.set('ไม่พบ game_id ของรายการ'); return; }

    this.working.set(true);
    this.api.cartRemove({ user_id: this.userId, game_id: gid }).subscribe({
      next: () => {
        this.items.update(list => list.filter(x => this.getGameId(x) !== gid));
        this.working.set(false);
      },
      error: err => { this.error.set(err?.message ?? 'ลบสินค้าไม่สำเร็จ'); this.working.set(false); }
    });
  }

  purchaseAll() {
  if (this.working() || this.items().length === 0) return;

  const code = this.selectedCode();
  const meetsMin =
    !code ||
    !(code.condition != null && Number(code.condition) > 0) ||
    this.subtotal() >= Number(code.condition);   // << แก้ชื่อให้ถูก

  const codeIdToUse = (code && meetsMin) ? Number(code.code_id) : undefined;

  this.working.set(true);
  this.error.set(null);

  this.api.cartPurchase(this.userId, codeIdToUse).subscribe({
    next: (res) => {
      this.items.set([]);
      this.selectedCodeId.set(null);
      this.working.set(false);
      const paid = (res as any)?.charged_total;
      alert(paid != null
        ? `ซื้อเกมสำเร็จ 🎉 ชำระจริง ฿${Number(paid).toLocaleString('th-TH')}`
        : 'ซื้อเกมสำเร็จ 🎉');
    },
    error: err => { this.error.set(err?.message ?? 'ชำระเงินไม่สำเร็จ'); this.working.set(false); }
  });
}


}
