import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';

import { HeaderComponent } from '../../header/header';
import { GameShopService } from '../../../services/api/game_shop.service';
import { DiscountCodeCreateRequest, DiscountCodeUpdateRequest } from '../../../models/request/discount_code_request';
import { DiscountCodeResponse } from '../../../models/response/discount_code_response';

@Component({
  selector: 'app-discount',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './discount.html',
  styleUrls: ['./discount.scss'],
})
export class Discount implements OnInit {
  private api = inject(GameShopService);

  // form
  codeName      = signal<string>('');
  maxUsage      = signal<number>(1);
  discountValue = signal<number>(10);
  minSpend      = signal<number | null>(null);

  // state
  loading  = signal<boolean>(false);
  listLoad = signal<boolean>(true);
  error    = signal<string | null>(null);
  okMsg    = signal<string | null>(null);
  editingId = signal<number | null>(null);

  // data
  codes = signal<DiscountCodeResponse[]>([]);
  q     = signal<string>('');

  filtered = computed(() => {
    const k = this.q().trim().toLowerCase();
    const list = this.codes();
    if (!k) return list;
    return list.filter(c =>
      c.code_name.toLowerCase().includes(k) ||
      String(c.discount_value).includes(k) ||
      String(c.max_usage).includes(k) ||
      (c.condition != null && String(c.condition).includes(k))
    );
  });

  ngOnInit() { this.reload(); }

  // ------- API -------
  reload() {
    this.listLoad.set(true);
    this.api.getAllDiscountCodes()
      .pipe(finalize(() => this.listLoad.set(false)))
      .subscribe({
        next: rows => { this.codes.set(rows ?? []); this.error.set(null); },
        error: err  => { this.error.set(this.normalizeErr(err, 'โหลดโค้ดไม่สำเร็จ')); this.autoClearMsg(); },
      });
  }

  submit() {
    if (!this.canSubmit || this.loading()) return;

    const code = this.codeName().trim().toUpperCase();
    const dup  = this.codes().some(c => c.code_name.toUpperCase() === code && c.code_id !== this.editingId());
    if (dup) { this.error.set(`มีโค้ด "${code}" อยู่แล้ว`); this.autoClearMsg(); return; }

    const body = {
      code_name: code,
      discount_value: Number(this.discountValue()),
      max_usage: Math.trunc(Number(this.maxUsage())),
      condition: this.minSpend() == null ? null : Number(this.minSpend()),
    };

    this.loading.set(true);
    const req$ = this.editingId() == null
      ? this.api.createDiscountCode(body as DiscountCodeCreateRequest)
      : this.api.updateDiscountCode(this.editingId()!, body as DiscountCodeUpdateRequest);

    req$.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: res => {
        this.okMsg.set(res?.message || 'บันทึกสำเร็จ');
        this.cancelEdit();
        this.reload();
        this.autoClearMsg();
      },
      error: err => { this.error.set(this.normalizeErr(err, 'บันทึกไม่สำเร็จ')); this.autoClearMsg(); },
    });
  }

  startEdit(c: DiscountCodeResponse) {
    this.editingId.set(c.code_id);
    this.codeName.set(c.code_name);
    this.discountValue.set(c.discount_value);
    this.maxUsage.set(c.max_usage);
    this.minSpend.set(c.condition);
    this.okMsg.set(null); this.error.set(null);
  }

  cancelEdit() {
    this.editingId.set(null);
    this.resetForm();
  }

  remove(c: DiscountCodeResponse) {
    if (!confirm(`ยืนยันลบโค้ด "${c.code_name}" ?`)) return;
    this.api.deleteDiscountCode(c.code_id).subscribe({
      next: () => this.reload(),
      error: err => alert(this.normalizeErr(err, 'ลบไม่สำเร็จ')),
    });
  }

  // ------- UI helpers -------
  get canSubmit(): boolean {
    const name = this.codeName().trim();
    const pct  = Number(this.discountValue() ?? 0);
    const max  = Math.trunc(Number(this.maxUsage() ?? 0));
    const cond = this.minSpend();
    return !!name && pct > 0 && pct <= 100 && max > 0 && (cond == null || cond >= 0);
  }

  onMinSpendChange(v: any) {
    if (v === '' || v == null) this.minSpend.set(null);
    else {
      const n = Number(v);
      this.minSpend.set(isNaN(n) ? null : n);
    }
  }

  resetForm() {
    this.codeName.set('');
    this.maxUsage.set(1);
    this.discountValue.set(10);
    this.minSpend.set(null);
  }

  thb(n: number | null | undefined) {
    if (n == null) return '-';
    return '฿' + new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 }).format(Number(n));
  }
  trackById = (_: number, c: DiscountCodeResponse) => c.code_id;

  private normalizeErr(err: any, fallback: string) {
    console.error('[discount] api error:', err);
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0)   return 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้ (Proxy/CORS/เซิร์ฟเวอร์ไม่ตอบสนอง)';
      if (err.status === 404) return 'ไม่พบปลายทาง API (ตรวจสอบเส้นทาง /games/**)';
      const msg = typeof err.error === 'string' ? err.error : (err.error?.message || err.message);
      return msg || fallback;
    }
    if (typeof err === 'string') return err;
    return fallback;
  }
  private autoClearMsg(ms = 2400) {
    window.setTimeout(() => { this.okMsg.set(null); this.error.set(null); }, ms);
  }
}
