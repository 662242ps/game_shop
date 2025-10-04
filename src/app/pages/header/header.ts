// ===== Header (standalone) =====
import { Component, Input, HostListener, OnInit } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { Router, NavigationEnd, RouterLink } from '@angular/router';
import { GameShopService } from '../../services/api/game_shop.service'; // < เพิ่ม
// ถ้า path ไม่ตรง ให้ปรับตามโครงสร้างโปรเจ็กต์ของคุณ

type Role = 'user' | 'admin';
type Key  = 'shop' | 'library' | 'cart' | 'users' | 'discount';

interface MenuItem {
  key: Key;
  label: string;
  iconClass: string;
  path?: string;
}

/** โครงสร้างที่เราเก็บลง localStorage จาก /users/login */
interface StoredUser {
  id?: number | string;
  username?: string;
  email?: string;
  role?: string;
  wallet?: number | string;
  hasImage?: boolean;
  message?: string;
  profileimage?: string | null;   // FE เก็บคีย์นี้
  profile_image?: string | null;  // กันกรณี BE ส่งแบบนี้
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [NgIf, NgFor, RouterLink],
  templateUrl: './header.html',
  styleUrls: ['./header.scss'],
})
export class HeaderComponent implements OnInit {
  @Input() role: Role = 'user';

  // ==== ชื่อ/อวตารจาก localStorage ====
  displayName = 'ผู้ใช้';
  avatarText  = 'U';
  avatarUrl?: string | null;

  private fetchingAvatar = false; // กันยิงซ้ำ

  // ==== เมนู ====
  readonly userMenus: MenuItem[] = [
    { key: 'shop',    iconClass: 'i-2', label: 'ร้านค้า',  path: '/user/shop' },
    { key: 'library', iconClass: 'i-3', label: 'คลังเกม',  path: '/user/library' },
    { key: 'cart',    iconClass: 'i-4', label: 'ตะกร้า',   path: '/user/cart' },
  ];

  readonly adminMenus: MenuItem[] = [
    { key: 'shop',     iconClass: 'i-2', label: 'ร้านค้า',     path: '/admin/shop' },
    { key: 'users',    iconClass: 'i-5', label: 'ผู้ใช้ทั้งหมด', path: '/admin/users' },
    { key: 'discount', iconClass: 'i-6', label: 'โค้ดส่วนลด',   path: '/admin/discount' },
  ];

  activeKey: Key | null = 'shop';
  profileActive = false;

  constructor(private router: Router, private api: GameShopService) {}

  ngOnInit(): void {
    this.hydrateFromStorage();
    this.updateActiveFromUrl(this.router.url);

    this.router.events.subscribe(e => {
      if (e instanceof NavigationEnd) {
        this.updateActiveFromUrl(e.urlAfterRedirects);
      }
    });
  }

  @HostListener('window:storage', ['$event'])
  onStorageChange(e: StorageEvent) {
    if (e.key === 'gs_user' || e.key === 'role') {
      this.hydrateFromStorage();
      this.updateActiveFromUrl(this.router.url);
    }
  }

  /** ดึงข้อมูลจาก localStorage แล้วตั้ง displayName / avatar / role
   *  ถ้าไม่มี URL รูปแต่รู้ว่า user มีรูป → ไปขอจาก API แล้ว cache ลง localStorage
   */
  private hydrateFromStorage() {
    try {
      const raw = localStorage.getItem('gs_user');
      const u: StoredUser = raw ? (JSON.parse(raw) ?? {}) : {};

      const nm = (u.username || '')?.toString().trim()
        || (u.email ? String(u.email).split('@')[0] : '');
      this.displayName = nm || 'ผู้ใช้';
      this.avatarText  = (this.displayName.charAt(0) || 'U').toUpperCase();

      // รองรับหลายคีย์
      this.avatarUrl = u.profileimage ?? u.profile_image ?? null;

      // ตั้งบทบาท
      const r = (u.role || '').toLowerCase();
      if (r === 'admin' || r === 'user') this.role = r as Role;

      // >>> สำคัญ: ถ้าไม่มี URL แต่รู้ว่ามีรูป (hasImage=true) → ดึงจาก API
      if (!this.avatarUrl && u?.hasImage && u?.id && !this.fetchingAvatar) {
        this.fetchingAvatar = true;
        this.api.getUserById(u.id!).subscribe({
          next: (res) => {
            const url = res?.profile_image || null;
            if (url) {
              this.avatarUrl = url;

              // อัปเดต gs_user ให้ครั้งถัดไปอ่านเจอเลย
              try {
                const cur = raw ? JSON.parse(raw) : {};
                const updated = { ...cur, profileimage: url };
                localStorage.setItem('gs_user', JSON.stringify(updated));
              } catch { /* ignore */ }
            }
          },
          error: () => { /* เงียบไว้ ใช้ fallback letter */ },
          complete: () => (this.fetchingAvatar = false),
        });
      }
    } catch { /* ignore */ }
  }

  onAvatarError() { this.avatarUrl = null; }

  get menus(): MenuItem[] { return this.role === 'admin' ? this.adminMenus : this.userMenus; }
  get profileRoute(): string { return '/user/profile'; }

  setActive(key: Key) { this.profileActive = false; this.activeKey = key; }
  isActive(m: MenuItem): boolean { return this.activeKey === m.key; }

  private updateActiveFromUrl(url: string) {
    const path = url.split('?')[0];
    if (this.role === 'user' && path.startsWith('/user/profile')) {
      this.profileActive = true; this.activeKey = null; return;
    }
    this.profileActive = false;
    const found = this.menus.find(m => m.path === path);
    this.activeKey = found ? found.key : null;
  }

  onProfileNav() {
    if (this.role !== 'user') return;
    this.profileActive = true; this.activeKey = null;
  }

  logout() {
    localStorage.removeItem('gs_user');
    localStorage.removeItem('role');
    this.router.navigateByUrl('/login');
  }

  trackByKey(_: number, m: MenuItem) { return m.key; }
}
