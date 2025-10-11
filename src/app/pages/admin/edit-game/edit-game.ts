import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { RouterModule, Router, RouterLink  } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

import { HeaderComponent } from '../../header/header';
import { GameShopService } from '../../../services/api/game_shop.service';
import { GamesGetResponse } from '../../../models/response/games_get_response';


@Component({
  selector: 'app-edit-game',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, HeaderComponent, RouterLink],
  templateUrl: './edit-game.html',
  styleUrls: ['./edit-game.scss'],
})
export class EditGameComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(GameShopService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  form!: FormGroup;
  loading   = signal<boolean>(true);
  submitting= signal<boolean>(false);
  errorMsg  = signal<string | null>(null);

  /** รูปตัวอย่างที่จะแสดง (เริ่มจากรูปเดิม, ถ้าเลือกใหม่จะเป็น dataURL) */
  previewUrl = signal<string | null>(null);
  /** เก็บไฟล์ใหม่ (ถ้าไม่ได้เลือก จะเป็น null → ใช้รูปเดิม) */
  selectedFile: File | null = null;

  /** id จากพาธ */
  id = signal<number>(0);

  ngOnInit(): void {
    this.form = this.fb.group({
      name:         ['', [Validators.required, Validators.maxLength(100)]],
      category_id:  [null, [Validators.required, Validators.min(1)]],
      description:  ['',[Validators.maxLength(1000)]],
      price:        [null, [Validators.required, Validators.min(0)]],
      image:        [null],  // ไม่บังคับ (แนบเฉพาะตอนเปลี่ยน)
    });

    const rawId = Number(this.route.snapshot.paramMap.get('id'));
    this.id.set(rawId);

    this.fetch();
  }

  private fetch(): void {
    this.loading.set(true);
    this.errorMsg.set(null);

    this.api.getGameById(this.id()).subscribe({
      next: (g: GamesGetResponse) => {
        this.form.patchValue({
          name:         g.name,
          category_id:  g.category_id,
          description:  g.description ?? '',
          price:        Number(g.price ?? 0),
        });
        this.previewUrl.set(this.api.toAbsoluteUrl(g.image));
      },
      error: (err) => {
        this.errorMsg.set(err?.message || 'โหลดข้อมูลเกมไม่สำเร็จ');
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }

  onPickFile(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;
    this.selectedFile = file;
    this.form.patchValue({ image: file });

    const reader = new FileReader();
    reader.onload = () => this.previewUrl.set(String(reader.result));
    reader.readAsDataURL(file);
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.errorMsg.set(null);

    const v = this.form.value;

    this.api.updateGame(this.id(), {
      name:        String(v.name).trim(),
      price:       Number(v.price),
      description: v.description ?? null,
      category_id: Number(v.category_id),
      image:       this.selectedFile || undefined,  // แนบเฉพาะตอนมีไฟล์ใหม่
    }).subscribe({
      next: () => this.router.navigateByUrl('/admin/shop'),
      error: (err) => {
        this.errorMsg.set(err?.message || 'บันทึกไม่สำเร็จ');
        this.submitting.set(false);
      },
      complete: () => this.submitting.set(false),
    });
  }

  remove() {
    if (!confirm('ยืนยันลบเกมนี้หรือไม่?')) return;
    this.api.deleteGame(this.id()).subscribe({
      next: () => this.router.navigateByUrl('/admin/shop'),
      error: (err) => this.errorMsg.set(err?.message || 'ลบไม่สำเร็จ'),
    });
  }

  cancel() {
    this.router.navigateByUrl('/admin/shop');
  }
}
