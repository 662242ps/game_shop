import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';

import { HeaderComponent } from '../../header/header';
import { GameShopService } from '../../../services/api/game_shop.service';
import { CreateGamePotsRequest } from '../../../models/request/creategame_post_Request';
import { CatagoryGetResponse } from '../../../models/response/catagory_get_response';

@Component({
  selector: 'app-add-game',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, HeaderComponent],
  templateUrl: './add-game.html',
  styleUrls: ['./add-game.scss']
})
export class AddGameComponent implements OnInit {
  // preview / state
  previewUrl = signal<string | null>(null);
  submitting = signal<boolean>(false);
  errorMsg   = signal<string | null>(null);

  // dropdown categories
  cats        = signal<CatagoryGetResponse[]>([]);
  catsLoading = signal<boolean>(true);
  catsError   = signal<string | null>(null);

  form!: FormGroup;

  constructor(private fb: FormBuilder, private api: GameShopService, private router: Router) {
    this.form = this.fb.group({
      name:         ['', [Validators.required, Validators.maxLength(100)]],
      category_id:  [null, [Validators.required, Validators.min(1)]], // ✅ ใช้ id เป็นค่า
      description:  ['', [Validators.maxLength(1000)]],
      price:        [null, [Validators.required, Validators.min(0)]],
      image:        [null, Validators.required], // File
    });
  }

  ngOnInit(): void {
    this.loadCategories();
  }

  private loadCategories() {
    this.catsLoading.set(true);
    this.catsError.set(null);
    this.api.getAllCategories().subscribe({
      next: (rows) => this.cats.set(rows || []),
      error: (e)    => this.catsError.set(e?.message || 'โหลดประเภทเกมไม่สำเร็จ'),
      complete: ()  => this.catsLoading.set(false),
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

    const dto: CreateGamePotsRequest = {
      name:        String(v.name).trim(),
      price:       Number(v.price),
      // ฝั่ง service จะส่ง '' ไปแล้ว BE แปลงเป็น null เอง
      description: (v.description ?? '') as any,
      release_date: new Date(),  // ไม่ได้ใช้จริง
      image:       '',           // ไม่ได้ใช้จริง (ไฟล์ส่งแยก)
      category_id: Number(v.category_id),  // ✅ id จาก select
      created_by:  this.api.getCurrentUser()?.id ?? 0,
    };

    const file: File = this.form.get('image')!.value;

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
