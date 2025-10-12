import { Routes } from '@angular/router'; 
import { Login } from './pages/login/login';
import { Signup } from './pages/users/signup/signup';
import { Shop } from './pages/users/shop/shop';
import { Shop as AdminShop } from './pages/admin/shop/shop';
import { AddGameComponent } from './pages/admin/add-game/add-game';
import { ProfileComponent } from './pages/users/profile/profile';
import { ProfileEditComponent } from './pages/users/profile-edit/profile-edit';
import { WalletComponent } from './pages/users/wallet/wallet';
import { EditGameComponent } from './pages/admin/edit-game/edit-game';

import { Library } from './pages/users/library/library';
import { Cart } from './pages/users/cart/cart';
import { AdminUsersPage as AdminUsers } from './pages/admin/users/users';
import { Discount as AdminDiscount } from './pages/admin/discount/discount';
import { UserDetailComponent } from './pages/admin/user-detail/user-detail';

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
      { path: 'library', component: Library },
      { path: 'cart', component: Cart },
      { path: 'wallet', component: WalletComponent },
      
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
      { path: 'add-game', component: AddGameComponent },
      { path: 'edit-game/:id', component: EditGameComponent },
      { path: 'users/:id', component: UserDetailComponent },
      // { path: '', pathMatch: 'full', redirectTo: 'shop' }
    ]
  },

  { path: '**', redirectTo: 'login' }
];
