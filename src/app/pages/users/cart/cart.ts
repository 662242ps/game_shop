// src/app/pages/users/cart/cart.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HeaderComponent } from '../../header/header';
import { GameShopService } from '../../../services/api/game_shop.service';
import { CartGetResponse } from '../../../models/response/cart_get_response'; // ✅ แก้ import ให้ถูก path

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent],
  templateUrl: './cart.html',
  styleUrl: './cart.scss'
})
export class Cart implements OnInit {
  private api = inject(GameShopService);
  private router = inject(Router);

  userId!: number;

  // UI state
  loading = signal<boolean>(true);
  working = signal<boolean>(false);
  error   = signal<string | null>(null);

  // ใช้โมเดลใหม่: items เป็น any[] ตามที่ BE ส่งมา
  items  = signal<any[]>([]);
  total  = computed(() =>
    this.items().reduce((s, i) => s + this.getTotal(i), 0)
  );
  count  = computed(() =>
    this.items().reduce((s, i) => s + this.getQty(i), 0)
  );

  ngOnInit(): void {
    const me = this.api.getCurrentUser();
    if (!me?.id) { this.router.navigate(['/login']); return; }
    this.userId = Number(me.id);
    this.loadCart();
  }

  private loadCart() {
    this.loading.set(true);
    this.error.set(null);
    this.api.cartGet(this.userId).subscribe({
      next: (res: CartGetResponse) => {
        // res.items เป็น any[] อยู่แล้วตามโมเดลใหม่
        this.items.set(Array.isArray(res?.items) ? res.items : []);
        this.loading.set(false);
      },
      error: err => { this.error.set(err?.message ?? 'โหลดตะกร้าไม่สำเร็จ'); this.loading.set(false); }
    });
  }

  /** ---- Helpers สำหรับอ่านค่าจาก item แบบยืดหยุ่น ---- */

  /** รูปภาพ: รองรับ field ที่พบบ่อย */
  imgUrlFromItem(it: any): string | null {
    const raw = it?.image ?? it?.img ?? it?.cover ?? it?.thumbnail ?? null;
    return raw ? (this.api.toAbsoluteUrl(raw) || null) : null;
  }

  /** ชื่อเกม: รองรับหลายฟิลด์ */
  getName(it: any): string {
    return String(it?.game_name ?? it?.name ?? it?.title ?? '');
  }

  /** ราคาเดี่ยว */
  getPrice(it: any): number {
    return Number(it?.price ?? 0);
  }

  /** จำนวน */
  getQty(it: any): number {
    return Number(it?.quantity ?? it?.qty ?? 0);
  }

  /** ยอดรวมต่อรายการ */
  getTotal(it: any): number {
    const tot = it?.total_price ?? it?.total ?? null;
    return tot != null ? Number(tot) : (this.getPrice(it) * this.getQty(it));
  }

  /** game_id สำหรับ call API ลบออก */
  getGameId(it: any): number {
    return Number(it?.game_id ?? it?.id ?? 0);
  }

  /** ---- Actions ---- */

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
    this.working.set(true);
    this.error.set(null);
    this.api.cartPurchase(this.userId).subscribe({
      next: () => { this.items.set([]); this.working.set(false); alert('ซื้อเกมสำเร็จ 🎉'); },
      error: err => { this.error.set(err?.message ?? 'ชำระเงินไม่สำเร็จ'); this.working.set(false); }
    });
  }

  /** ยังเก็บไว้เผื่อ template เดิมเรียกใช้โดยส่ง path ตรง ๆ */
  imgUrl(p?: string | null): string | null {
    return this.api.toAbsoluteUrl(p || '') || null;
  }
}
