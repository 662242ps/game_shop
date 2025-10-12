import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HeaderComponent } from '../../header/header';
import { GameShopService } from '../../../services/api/game_shop.service';
import { WalletPotsRequest } from '../../../models/request/wallet_pots_request';
import { WalletTxnGetResponse } from '../../../models/response/wallettxn_get_response';
import { finalize } from 'rxjs/operators';

type Txn = {
  kind: 'เติมเงิน' | 'ซื้อเกม' | string;
  name: string;
  amount: number;
  date?: string | Date;   // รองรับทั้ง string/Date ตามโมเดล
};

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, HeaderComponent],
  templateUrl: './wallet.html',
  styleUrl: './wallet.scss'
})
export class WalletComponent implements OnInit {
  private api = inject(GameShopService);
  private fb  = inject(FormBuilder);
  private router = inject(Router);

  // ===== UI state =====
  loading = signal<boolean>(false);
  posting = signal<boolean>(false);
  error   = signal<string | null>(null);

  // ===== Data =====
  userId!: number;
  balance = signal<number>(0);
  txns = signal<Txn[]>([]);
  quickAmounts = [100, 200, 500];

  form!: FormGroup;

  ngOnInit(): void {
    // ฟอร์ม
    this.form = this.fb.group({
      amount: [null as number | null, [Validators.min(1)]],
    });

    // ผู้ใช้ปัจจุบัน
    const me = this.api.getCurrentUser();
    if (!me?.id) {
      this.router.navigate(['/login']);
      return;
    }
    this.userId = Number(me.id);

    // โหลดข้อมูล
    this.loadAll();
  }

  /** โหลดยอดเงินและประวัติธุรกรรม */
  private loadAll() {
    this.loading.set(true);
    this.error.set(null);

    // ดึงข้อมูลผู้ใช้ -> คำนวณยอด wallet
    this.api.walletGetBalance(this.userId).subscribe({
      next: (u: any) => {
        const bal = Number(u?.wallet_balance ?? u?.wallet ?? u?.balance ?? 0);
        this.balance.set(Number.isFinite(bal) ? bal : 0);
      },
      error: err => this.error.set(err?.message ?? 'โหลดยอดเงินไม่สำเร็จ'),
    });

    // ดึงประวัติธุรกรรม (เส้นจริง: /users/transaction/:id)
    this.api.walletGetTransactions(this.userId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: list => this.txns.set(this.mapTxns(list)),
        error: err => {
          const msg = String(err?.message || '');
          // ถ้า BE คืน 404/ไม่มีรายการ ให้แสดงลิสต์ว่างแทน error
          if (/ไม่พบ|not\s*found|404/i.test(msg)) {
            this.txns.set([]);
          } else {
            this.error.set(msg || 'โหลดประวัติธุรกรรมไม่สำเร็จ');
          }
        },
      });
  }

  /** แปลงข้อมูลธุรกรรมจาก API -> UI */
  private mapTxns(rows: WalletTxnGetResponse[]): Txn[] {
    return (rows || []).map(r => ({
      kind: r.type,
      name: r.note || (r.type === 'เติมเงิน' ? 'Wallet Balance' : ''),
      amount: Number(r.amount),                                   // amount มาจาก DB เป็น string
      date: r.date instanceof Date ? r.date : new Date(String(r.date)),
    }));
  }

  pickQuick(v: number) {
    this.form.patchValue({ amount: v });
  }

  topup() {
    const amt = Number(this.form.value.amount ?? 0);
    if (!amt || amt <= 0 || this.posting()) return;

    const payload: WalletPotsRequest = { amount: amt };
    this.posting.set(true);
    this.error.set(null);

    this.api.walletDeposit(this.userId, payload)
      .pipe(finalize(() => this.posting.set(false)))
      .subscribe({
        next: () => {
          // อัปเดตยอดทันที
          this.balance.update(b => Number(b) + amt);
          // เติมรายการธุรกรรมใหม่ด้านบน
          this.txns.update(list => [
            { kind: 'เติมเงิน', name: 'Wallet Balance', amount: amt, date: new Date() },
            ...list
          ]);
          this.form.reset();
        },
        error: err => this.error.set(err?.message ?? 'เติมเงินไม่สำเร็จ')
      });
  }
}
