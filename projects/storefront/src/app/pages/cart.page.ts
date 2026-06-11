import { CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { imageUrl } from '@zentro/shared';
import { ButtonModule } from 'primeng/button';

import { CartItem, CartService } from '../services/cart.service';

@Component({
  selector: 'app-cart-page',
  imports: [CurrencyPipe, RouterLink, ButtonModule],
  template: `
    <h1>Carrinho</h1>

    @if (cart.items().length === 0) {
      <div class="empty z-card">
        <i class="pi pi-shopping-cart"></i>
        <p>Seu carrinho está vazio.</p>
        <a routerLink="/">Ver produtos</a>
      </div>
    } @else {
      <div class="list">
        @for (item of cart.items(); track trackId(item)) {
          <div class="item z-card">
            <div class="img">
              @if (img(item.imageId); as src) {
                <img [src]="src" [alt]="item.name" />
              } @else {
                <i class="pi pi-image"></i>
              }
            </div>
            <div class="info">
              <span class="name">{{ item.name }}</span>
              @if (item.variantName) {
                <span class="variant z-muted">{{ item.variantName }}</span>
              }
              <span class="unit z-muted">{{ item.unitPrice | currency: 'BRL' }} cada</span>
            </div>
            <div class="actions">
              <div class="stepper">
                <button type="button" (click)="cart.setQty(item, item.qty - 1)" aria-label="Diminuir">
                  <i class="pi pi-minus"></i>
                </button>
                <span>{{ item.qty }}</span>
                <button type="button" (click)="cart.setQty(item, item.qty + 1)" aria-label="Aumentar">
                  <i class="pi pi-plus"></i>
                </button>
              </div>
              <span class="z-price">{{ item.qty * item.unitPrice | currency: 'BRL' }}</span>
              <button type="button" class="remove" (click)="cart.remove(item)" aria-label="Remover">
                <i class="pi pi-trash"></i>
              </button>
            </div>
          </div>
        }
      </div>

      <div class="summary z-card">
        <div class="row">
          <span>Subtotal</span>
          <span class="z-price">{{ cart.subtotal() | currency: 'BRL' }}</span>
        </div>
        <p class="z-muted note">Taxa de entrega calculada no checkout.</p>
        <p-button
          label="Fechar pedido"
          icon="pi pi-check"
          styleClass="w-full"
          routerLink="/checkout"
        />
        <a routerLink="/" class="continue">Continuar comprando</a>
      </div>
    }
  `,
  styles: [
    `
      h1 {
        font-size: 1.3rem;
        margin: 0 0 1rem;
      }
      .empty {
        text-align: center;
        padding: 3rem 1rem;
      }
      .empty .pi {
        font-size: 2.2rem;
        color: var(--z-fg-muted);
      }
      .list {
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
        margin-bottom: 1rem;
      }
      .item {
        display: flex;
        gap: 0.8rem;
        align-items: center;
        padding: 0.7rem;
      }
      .img {
        width: 64px;
        height: 64px;
        flex: 0 0 auto;
        border-radius: 8px;
        overflow: hidden;
        background: var(--z-bg);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--z-gray);
        font-size: 1.4rem;
      }
      .img img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
        min-width: 0;
      }
      .name {
        font-weight: 600;
        font-size: 0.88rem;
      }
      .variant,
      .unit {
        font-size: 0.75rem;
      }
      .actions {
        display: flex;
        align-items: center;
        gap: 0.7rem;
        flex-wrap: wrap;
        justify-content: flex-end;
      }
      .stepper {
        display: flex;
        align-items: center;
        border: 1px solid var(--z-gray);
        border-radius: 999px;
        overflow: hidden;
      }
      .stepper button {
        border: none;
        background: transparent;
        width: 32px;
        height: 32px;
        cursor: pointer;
        color: var(--z-blue);
      }
      .stepper span {
        min-width: 28px;
        text-align: center;
        font-weight: 600;
        font-size: 0.85rem;
      }
      .remove {
        border: none;
        background: transparent;
        color: var(--z-danger);
        cursor: pointer;
        font-size: 0.95rem;
        padding: 0.4rem;
      }
      .summary {
        max-width: 420px;
        margin-left: auto;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
      }
      .summary .row {
        display: flex;
        justify-content: space-between;
        font-weight: 600;
      }
      .summary .note {
        margin: 0;
        font-size: 0.75rem;
      }
      .continue {
        text-align: center;
        font-size: 0.85rem;
      }
      :host ::ng-deep .w-full {
        width: 100%;
      }
    `,
  ],
})
export class CartPage {
  protected readonly cart = inject(CartService);

  protected trackId(item: CartItem): string {
    return `${item.productId}:${item.variantId}`;
  }

  protected img(id: number | null): string | null {
    return imageUrl(id, 'thumb');
  }
}
