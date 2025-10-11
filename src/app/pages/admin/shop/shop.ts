import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../../header/header';

type Game = { id: number; name: string; price: number; cover?: string | null };

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HeaderComponent],
  templateUrl: './shop.html',
  styleUrl: './shop.scss'
})
export class Shop {
  /** คีย์เวิร์ดค้นหา (UI เท่านั้น) */
  query = signal<string>('');

  /** เดโม่รายการเกม (ถ้าไม่มีภาพ ระบบจะใส่ placeholder ให้เอง) */
  games = signal<Game[]>([
    { id: 1, name: 'Devil May Cry 5', price: 1059, cover: null },
    { id: 2, name: 'Sekiro',          price: 1390, cover: null },
    { id: 3, name: 'ELDEN RING',      price: 1790, cover: null },
    { id: 4, name: 'FINAL FANTASY XV',price: 1790, cover: null },
    { id: 5, name: 'Far Cry 4',       price: 1799, cover: null },
    { id: 6, name: 'Stardew Valley',  price: 315,  cover: null },
    { id: 7, name: 'Dead by Daylight',price: 469,  cover: null },
  ]);

  /** รายการหลังกรอง */
  filtered = computed(() => {
    const q = (this.query() ?? '').trim().toLowerCase();
    if (!q) return this.games();
    return this.games().filter(g =>
      g.name.toLowerCase().includes(q) || String(g.price).includes(q)
    );
  });

  /** จำนวนทั้งหมด (ก่อนกรอง) */
  total = computed(() => this.games().length);

  edit(g: Game) { /* TODO: link ไปหน้าแก้ไขหรือเปิด dialog */ }
  remove(g: Game) { /* TODO: ลบเกม */ }
}
