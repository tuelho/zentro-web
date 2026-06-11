import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProductDetail, StoreApi, VariantView, imageUrl } from '@zentro/shared';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';

import { CartService } from '../services/cart.service';

@Component({
  selector: 'app-product-page',
  imports: [CurrencyPipe, RouterLink, ButtonModule],
  template: `
    @if (product(); as p) {
      <nav class="crumb z-muted">
        <a routerLink="/">Início</a>
        <i class="pi pi-angle-right"></i>
        <span>{{ p.name }}</span>
      </nav>

      <div class="layout">
        <section class="gallery">
          <div class="main-img z-card">
            @if (mainImage(); as src) {
              <img [src]="src" [alt]="p.name" />
            } @else {
              <div class="no-img"><i class="pi pi-image"></i></div>
            }
          </div>
          @if (p.imageIds.length > 1) {
            <div class="thumbs">
              @for (id of p.imageIds; track id) {
                <button
                  type="button"
                  class="thumb"
                  [class.active]="id === selectedImageId()"
                  (click)="selectedImageId.set(id)"
                >
                  <img [src]="thumb(id)" alt="" />
                </button>
              }
            </div>
          }
        </section>

        <section class="details">
          <h1>{{ p.name }}</h1>
          @if (p.shortDescription) {
            <p class="z-muted short">{{ p.shortDescription }}</p>
          }

          <div class="price-row">
            @if (p.originalPrice && !selectedVariant()) {
              <s class="z-muted">{{ p.originalPrice | currency: 'BRL' }}</s>
            }
            <span class="z-price big">{{ currentPrice() | currency: 'BRL' }}</span>
            <span class="z-muted">/ {{ p.unit }}</span>
          </div>

          @if (stockStatus() === 'ULTIMAS_UNIDADES') {
            <span class="stock warn">Últimas unidades!</span>
          } @else if (stockStatus() === 'ESGOTADO') {
            <span class="stock out">Esgotado</span>
          }

          @if (p.hasVariants) {
            <div class="variants">
              <span class="label">Escolha uma opção:</span>
              @for (v of p.variants; track v.id) {
                <button
                  type="button"
                  class="variant"
                  [class.active]="selectedVariant()?.id === v.id"
                  [disabled]="v.stockStatus === 'ESGOTADO'"
                  (click)="selectVariant(v)"
                >
                  <span class="v-name">{{ v.name }}</span>
                  <span class="v-meta">
                    <span class="z-price">{{ v.price | currency: 'BRL' }}</span>
                    @if (v.stockStatus === 'ESGOTADO') {
                      <span class="z-muted">esgotado</span>
                    } @else if (v.stockStatus === 'ULTIMAS_UNIDADES') {
                      <span class="warn-text">últimas unidades</span>
                    }
                  </span>
                </button>
              }
            </div>
          }

          <div class="buy-row">
            <div class="stepper">
              <button type="button" (click)="dec()" [disabled]="qty() <= 1" aria-label="Diminuir">
                <i class="pi pi-minus"></i>
              </button>
              <span>{{ qty() }}</span>
              <button type="button" (click)="inc()" aria-label="Aumentar">
                <i class="pi pi-plus"></i>
              </button>
            </div>
            <p-button
              label="Adicionar ao carrinho"
              icon="pi pi-shopping-cart"
              [disabled]="stockStatus() === 'ESGOTADO'"
              (onClick)="addToCart()"
            />
          </div>

          @if (p.description) {
            <div class="description z-card">
              <h2>Descrição</h2>
              <p>{{ p.description }}</p>
            </div>
          }
        </section>
      </div>
    } @else if (error()) {
      <div class="missing z-card">
        <i class="pi pi-exclamation-circle"></i>
        <p>Produto não encontrado.</p>
        <a routerLink="/">Voltar para a loja</a>
      </div>
    }
  `,
  styles: [
    `
      .crumb {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.8rem;
        margin-bottom: 1rem;
      }
      .layout {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.5rem;
      }
      @media (min-width: 760px) {
        .layout {
          grid-template-columns: minmax(0, 440px) 1fr;
        }
      }
      .main-img {
        padding: 0;
        overflow: hidden;
        aspect-ratio: 1;
      }
      .main-img img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .no-img {
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--z-gray);
        font-size: 3rem;
      }
      .thumbs {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.6rem;
        overflow-x: auto;
      }
      .thumb {
        width: 64px;
        height: 64px;
        flex: 0 0 auto;
        padding: 0;
        border: 2px solid var(--z-gray);
        border-radius: 8px;
        overflow: hidden;
        cursor: pointer;
        background: var(--z-surface);
      }
      .thumb.active {
        border-color: var(--z-blue);
      }
      .thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      h1 {
        margin: 0 0 0.25rem;
        font-size: 1.4rem;
      }
      .short {
        margin: 0 0 0.75rem;
      }
      .price-row {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
      }
      .big {
        font-size: 1.5rem;
      }
      .stock {
        display: inline-block;
        font-size: 0.78rem;
        font-weight: 600;
        padding: 0.2rem 0.6rem;
        border-radius: 999px;
        color: #fff;
        margin-bottom: 0.75rem;
      }
      .stock.warn {
        background: var(--z-warning);
      }
      .stock.out {
        background: var(--z-fg-muted);
      }
      .variants {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin: 1rem 0;
      }
      .variants .label {
        font-weight: 600;
        font-size: 0.85rem;
      }
      .variant {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.75rem;
        border: 1px solid var(--z-gray);
        border-radius: var(--z-radius);
        background: var(--z-surface);
        padding: 0.65rem 0.9rem;
        font-family: inherit;
        font-size: 0.85rem;
        cursor: pointer;
        text-align: left;
      }
      .variant.active {
        border-color: var(--z-blue);
        outline: 2px solid var(--z-blue);
        outline-offset: -2px;
      }
      .variant:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .v-name {
        font-weight: 500;
      }
      .v-meta {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
        font-size: 0.78rem;
      }
      .warn-text {
        color: var(--z-warning);
        font-weight: 600;
      }
      .buy-row {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin: 1.25rem 0;
        flex-wrap: wrap;
      }
      .stepper {
        display: flex;
        align-items: center;
        border: 1px solid var(--z-gray);
        border-radius: 999px;
        background: var(--z-surface);
        overflow: hidden;
      }
      .stepper button {
        border: none;
        background: transparent;
        width: 40px;
        height: 40px;
        cursor: pointer;
        color: var(--z-blue);
      }
      .stepper button:disabled {
        color: var(--z-gray);
        cursor: not-allowed;
      }
      .stepper span {
        min-width: 36px;
        text-align: center;
        font-weight: 600;
      }
      .description {
        margin-top: 1rem;
      }
      .description h2 {
        margin: 0 0 0.5rem;
        font-size: 1rem;
      }
      .description p {
        margin: 0;
        white-space: pre-line;
        line-height: 1.6;
      }
      .missing {
        text-align: center;
        padding: 3rem 1rem;
      }
      .missing .pi {
        font-size: 2rem;
        color: var(--z-fg-muted);
      }
    `,
  ],
})
export class ProductPage implements OnInit {
  private api = inject(StoreApi);
  private route = inject(ActivatedRoute);
  private cart = inject(CartService);
  private messages = inject(MessageService);

  protected readonly product = signal<ProductDetail | null>(null);
  protected readonly error = signal(false);
  protected readonly selectedImageId = signal<number | null>(null);
  protected readonly selectedVariant = signal<VariantView | null>(null);
  protected readonly qty = signal(1);

  protected readonly currentPrice = computed(
    () => this.selectedVariant()?.price ?? this.product()?.price ?? 0,
  );
  protected readonly stockStatus = computed(() => {
    const variant = this.selectedVariant();
    return variant ? variant.stockStatus : (this.product()?.stockStatus ?? 'DISPONIVEL');
  });
  protected readonly mainImage = computed(() => imageUrl(this.selectedImageId(), 'full'));

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug')!;
      this.api.product(slug).subscribe({
        next: (p) => {
          this.product.set(p);
          this.selectedImageId.set(p.imageIds[0] ?? null);
          this.selectedVariant.set(null);
          this.qty.set(1);
        },
        error: () => this.error.set(true),
      });
    });
  }

  protected thumb(id: number): string | null {
    return imageUrl(id, 'thumb');
  }

  protected selectVariant(v: VariantView): void {
    this.selectedVariant.set(v);
  }

  protected inc(): void {
    this.qty.update((q) => q + 1);
  }

  protected dec(): void {
    this.qty.update((q) => Math.max(1, q - 1));
  }

  protected addToCart(): void {
    const p = this.product();
    if (!p) return;

    const variant = this.selectedVariant();
    if (p.hasVariants && !variant) {
      this.messages.add({
        severity: 'warn',
        summary: 'Escolha uma opção',
        detail: 'Selecione uma variação do produto antes de adicionar ao carrinho.',
      });
      return;
    }

    this.cart.add({
      productId: p.id,
      variantId: variant?.id ?? null,
      name: p.name,
      variantName: variant?.name ?? null,
      unitPrice: this.currentPrice(),
      qty: this.qty(),
      imageId: p.imageIds[0] ?? null,
    });

    this.messages.add({
      severity: 'success',
      summary: 'Adicionado ao carrinho',
      detail: `${this.qty()}x ${p.name}${variant ? ' (' + variant.name + ')' : ''}`,
    });
  }
}
