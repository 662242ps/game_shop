import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Signup } from './pages/users/signup/signup';
import { Shop } from './pages/users/shop/shop';
import { Shop as AdminShop } from './pages/admin/shop/shop';
import { ProfileComponent } from './pages/users/profile/profile';

import { ProfileEditComponent } from './pages/users/profile-edit/profile-edit';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  { path: 'login', component: Login },

  // ✅ ย้ายมาอยู่ใต้ /user/*
  {
    path: 'user',
    children: [
      { path: 'signup', component: Signup },
      { path: 'shop', component: Shop },
      { path: 'profile', component: ProfileComponent },
      { path: 'profile-edit', component: ProfileEditComponent },
      // จะให้ /user เข้า shop เลยก็ได้ (ถ้าอยาก)
      // { path: '', pathMatch: 'full', redirectTo: 'shop' }
    ]
  },
  {
    path: 'admin',
    children: [
      { path: 'shop', component: AdminShop },
      // จะให้ /user เข้า shop เลยก็ได้ (ถ้าอยาก)
      // { path: '', pathMatch: 'full', redirectTo: 'shop' }
    ]
  },

  { path: '**', redirectTo: 'login' }
];
