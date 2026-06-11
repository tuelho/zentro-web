import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';

import { CartService } from './services/cart.service';
import { StoreService } from './services/store.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, FormsModule, InputTextModule, ToastModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly storeSvc = inject(StoreService);
  protected readonly cart = inject(CartService);
  private readonly router = inject(Router);

  protected searchTerm = '';

  constructor() {
    this.storeSvc.load();
  }

  protected search(): void {
    const q = this.searchTerm.trim();
    this.router.navigate(['/'], { queryParams: q ? { q } : {} });
  }
}
