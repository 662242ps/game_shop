import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../../header/header';

@Component({
  selector: 'app-add-game',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, HeaderComponent],
  templateUrl: './add-game.html',
  styleUrl: './add-game.scss'
})
export class AddGameComponent {
  previewUrl = signal<string | null>(null);

  // ✅ ประกาศไว้ก่อน แล้วค่อยกำหนดค่าใน constructor
  form!: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      name:        ['', [Validators.required, Validators.maxLength(100)]],
      category:    ['', Validators.required],
      description: ['', [Validators.required, Validators.maxLength(1000)]],
      releaseDate: ['', Validators.required],
      price:       [null, [Validators.required, Validators.min(0)]],
      image:       [null]
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
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    console.log('FORM:', this.form.value);
    alert('บันทึกสำเร็จ (เดโม UI)');
  }

  resetForm() {
    this.form.reset();
    this.previewUrl.set(null);
  }
}
