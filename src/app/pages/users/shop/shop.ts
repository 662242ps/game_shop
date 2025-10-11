import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../header/header';

@Component({
  selector: 'app-shop',
  imports: [CommonModule, HeaderComponent],
  templateUrl: './shop.html',
  styleUrl: './shop.scss'
})
export class Shop {

}
