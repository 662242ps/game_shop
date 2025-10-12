import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { HeaderComponent } from '../../header/header'; // ปรับ path ตามโปรเจกต์คุณ
import { GameShopService } from '../../../services/api/game_shop.service';
import { WalletTxnGetResponse } from '../../../models/response/wallettxn_get_response';

type TxnRow = {
  kind: string;
  name: string;
  amount: number;
  date?: string | Date;
};

@Component({
  standalone: true,
  selector: 'app-user-detail',
  imports: [CommonModule, RouterModule, HeaderComponent],
  templateUrl: './user-detail.html',
  styleUrl: './user-detail.scss'
})
export class UserDetailComponent implements OnInit {
  private api = inject(GameShopService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  userId!: number;

  loadingUser = signal<boolean>(false);
  loadingTxn  = signal<boolean>(false);
  error = signal<string | null>(null);

  user = signal<any | null>(null);
  txns = signal<TxnRow[]>([]);

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = Number(idParam);
    if (!id) {
      this.error.set('ไม่พบรหัสผู้ใช้');
      return;
    }
    this.userId = id;
    this.loadUser();
    this.loadTransactions();
  }

  private loadUser() {
    this.loadingUser.set(true);
    this.api.getUserById(this.userId).subscribe({
      next: (u) => this.user.set(u),
      error: (err) => this.error.set(err?.message || 'โหลดข้อมูลผู้ใช้ไม่สำเร็จ'),
      complete: () => this.loadingUser.set(false),
    });
  }

  private loadTransactions() {
    this.loadingTxn.set(true);
    this.api.walletGetTransactions(this.userId).subscribe({
      next: (rows) => {
        const mapped = (rows || []).map((r: WalletTxnGetResponse) => ({
          kind: r.type,
          name: r.note || (r.type === 'เติมเงิน' ? 'Wallet Balance' : ''),
          amount: Number(r.amount),
          date: r.date instanceof Date ? r.date : new Date(String(r.date)),
        }));
        this.txns.set(mapped);
      },
      error: (err) => {
        const msg = String(err?.message || '');
        if (/404|ไม่พบ/i.test(msg)) this.txns.set([]); else this.error.set(msg);
      },
      complete: () => this.loadingTxn.set(false),
    });
  }

  avatarUrl(): string {
    const u = this.user();
    const src = u?.profile_image ?? u?.profileimage ?? '';
    return this.api.toAbsoluteUrl(src) || 'assets/images/avatar-placeholder.png';
  }

  logout() {
    this.api.logout();
    this.router.navigate(['/login']);
  }
}
