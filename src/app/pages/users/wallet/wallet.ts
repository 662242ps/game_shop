import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../../header/header';

type Txn = { kind: 'เติมเงิน' | 'ซื้อเกม'; name: string; amount: number };

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, HeaderComponent],
  templateUrl: './wallet.html',
  styleUrl: './wallet.scss'
})
export class WalletComponent {
  balance = signal<number>(6750);
  quickAmounts = [100, 200, 500];

  // ✅ ประกาศไว้ก่อน แล้วค่อยกำหนดค่าใน constructor
  form!: FormGroup;

  // ประวัติเดโม่
  txns = signal<Txn[]>([
    { kind: 'เติมเงิน', name: 'Wallet Balance', amount: 400 },
    { kind: 'ซื้อเกม',  name: 'Hollow Knight Silksong', amount: 400 },
    { kind: 'ซื้อเกม',  name: 'Palworld', amount: 590 },
  ]);

  constructor(private fb: FormBuilder) {
    // ✅ สร้างฟอร์มที่นี่ ไม่ใช้ตอน field initializer อีกต่อไป
    this.form = this.fb.group({
      amount: [null as number | null, [Validators.min(1)]],
    });
  }

  pickQuick(v: number) {
    this.form.patchValue({ amount: v });
  }

  topup() {
    const amt = this.form.value.amount ?? 0;
    if (amt <= 0) return;

    this.balance.update(b => b + amt);
    this.txns.update(list => [
      { kind: 'เติมเงิน', name: 'Wallet Balance', amount: amt },
      ...list,
    ]);
    this.form.reset();
  }
}
