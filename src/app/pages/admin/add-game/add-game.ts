import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';

import { HeaderComponent } from '../../header/header';
import { GameShopService } from '../../../services/api/game_shop.service';
import { CreateGamePotsRequest } from '../../../models/request/creategame_post_Request';
@Component({
  selector: 'app-add-game',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, HeaderComponent],
  templateUrl: './add-game.html',
  styleUrls: ['./add-game.scss']
})
export class AddGameComponent {
  previewUrl = signal<string | null>(null);
  submitting = signal<boolean>(false);
  errorMsg   = signal<string | null>(null);

  form!: FormGroup;

  constructor(private fb: FormBuilder, private api: GameShopService, private router: Router) {
    this.form = this.fb.group({
      name:         ['', [Validators.required, Validators.maxLength(100)]],
      category_id:  [null, [Validators.required, Validators.min(1)]],
      description:  ['',[Validators.maxLength(1000)]],  // ไม่บังคับ
      price:        [null, [Validators.required, Validators.min(0)]],
      image:        [null, Validators.required],        // File
    });
  }

  onPickFile(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;
    this.form.patchValue({ image: file });
    const reader = new FileReader();
    reader.onload = () => this.previewUrl.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  submit() {
    this.errorMsg.set(null);
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const v = this.form.value;

    // ✅ สร้าง DTO ตามโมเดล CreateGamePotsRequest
    const dto: CreateGamePotsRequest = {
      name:        String(v.name).trim(),
      price:       Number(v.price),
      // โมเดลเป็น null เท่านั้น → แคสต์ค่าจากฟอร์มให้เป็น null ได้
      description: (v.description ? null : null) as any,   // ถ้าต้องการส่งข้อความ ให้แก้ type ของโมเดลเป็น string | null
      release_date: new Date(),                             // ไม่ได้ใช้งานจริง (BE ใส่ CURDATE())
      image:       '',                                      // ไม่ได้ใช้งานจริง (ไฟล์ส่งแยก)
      category_id: Number(v.category_id),
      created_by:  this.api.getCurrentUser()?.id ?? 0,
    };

    const file: File = v.image;

    this.submitting.set(true);
    this.api.gamesCreate(dto, file).subscribe({
      next: () => this.router.navigateByUrl('/admin/shop'),
      error: (err: any) => { this.errorMsg.set(err?.message || 'บันทึกไม่สำเร็จ'); this.submitting.set(false); },
      complete: () => this.submitting.set(false),
    });
  }

  resetForm() {
    this.form.reset();
    this.previewUrl.set(null);
    this.errorMsg.set(null);
  }
}
