import { Routes } from '@angular/router'; 
import { Login } from './pages/login/login';
import { Signup } from './pages/users/signup/signup';
import { Shop } from './pages/users/shop/shop';
import { Shop as AdminShop } from './pages/admin/shop/shop';
import { ProfileComponent } from './pages/users/profile/profile';
import { ProfileEditComponent } from './pages/users/profile-edit/profile-edit';

/* ✅ ใหม่ */
import { Library } from './pages/users/library/library';
import { Cart } from './pages/users/cart/cart';
import { Users as AdminUsers } from './pages/admin/users/users';
import { Discount as AdminDiscount } from './pages/admin/discount/discount';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  { path: 'login', component: Login },

  {
    path: 'user',
    children: [
      { path: 'signup', component: Signup },
      { path: 'shop', component: Shop },
      { path: 'profile', component: ProfileComponent },
      { path: 'profile-edit', component: ProfileEditComponent },

      /* ✅ ใหม่ */
      { path: 'library', component: Library },
      { path: 'cart', component: Cart },

      // { path: '', pathMatch: 'full', redirectTo: 'shop' }
    ]
  },
  {
    path: 'admin',
    children: [
      { path: 'shop', component: AdminShop },

      /* ✅ ใหม่ */
      { path: 'users', component: AdminUsers },
      { path: 'discount', component: AdminDiscount },

      // { path: '', pathMatch: 'full', redirectTo: 'shop' }
    ]
  },

  { path: '**', redirectTo: 'login' }
];
