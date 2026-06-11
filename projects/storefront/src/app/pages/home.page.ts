import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CategoryCard, ProductCard, StoreApi, imageUrl } from '@zentro/shared';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-home-page',
  imports: [CurrencyPipe, RouterLink, ButtonModule],
  template: `
    @if (categories().length > 0) {
      <div class="chips">
        <button
          type="button"
          class="chip"
          [class.active]="categoryId() === null"
          (click)="selectCategory(null)"
        >
          Todos
        </button>
        @for (cat of categories(); track cat.id) {
          <button
            type="button"
            class="chip"
            [class.active]="categoryId() === cat.id"
            (click)="selectCategory(cat.id)"
          >
            {{ cat.name }}
          </button>
        }
      </div>
    }

    @if (q()) {
      <p class="z-muted search-info">
        Resultados para “{{ q() }}” — {{ total() }} produto(s)
      </p>
    }

    @if (!loading() && products().length === 0) {
      <div class="empty z-card">
        <i class="pi pi-inbox"></i>
        <p>Nenhum produto encontrado.</p>
      </div>
    }

    <div class="grid">
      @for (p of products(); track p.id) {
        <a
          class="card z-card"
          [class.out]="p.stockStatus === 'ESGOTADO'"
          [routerLink]="['/produto', p.slug]"
        >
          <div class="img-wrap">
            @if (img(p.coverImageId); as src) {
              <img [src]="src" [alt]="p.name" loading="lazy" />
            } @else {
              <div class="no-img"><i class="pi pi-image"></i></div>
            }
            @if (p.stockStatus === 'ULTIMAS_UNIDADES') {
              <span class="badge badge-warn">Últimas unidades!</span>
            } @else if (p.stockStatus === 'ESGOTADO') {
              <span class="badge badge-out">Esgotado</span>
            }
          </div>
          <div class="info">
            <span class="name">{{ p.name }}</span>
            @if (p.shortDescription) {
              <span class="desc z-muted">{{ p.shortDescription }}</span>
            }
            <span class="price-row">
              @if (p.originalPrice) {
                <s class="z-muted">{{ p.originalPrice | currency: 'BRL' }}</s>
              }
              <span class="z-price">{{ p.price | currency: 'BRL' }}</span>
              <span class="unit z-muted">/ {{ p.unit }}</span>
            </span>
          </div>
        </a>
      }
    </div>

    @if (hasMore()) {
      <div class="more">
        <p-button
          label="Carregar mais"
          icon="pi pi-angle-down"
          severity="secondary"
          [outlined]="true"
          [loading]="loading()"
          (onClick)="loadMore()"
        />
      </div>
    }
  `,
  styles: [
    `
      .chips {
        display: flex;
        gap: 0.5rem;
        overflow-x: auto;
        padding-bottom: 0.75rem;
        margin-bottom: 0.75rem;
      }
      .chip {
        border: 1px solid var(--z-gray);
        background: var(--z-surface);
        color: var(--z-fg);
        border-radius: 999px;
        padding: 0.4rem 0.9rem;
        font-family: inherit;
        font-size: 0.82rem;
        font-weight: 500;
        cursor: pointer;
        white-space: nowrap;
      }
      .chip.active {
        background: var(--z-blue);
        border-color: var(--z-blue);
        color: #fff;
      }
      .search-info {
        margin: 0 0 0.75rem;
      }
      .empty {
        text-align: center;
        padding: 3rem 1rem;
        color: var(--z-fg-muted);
      }
      .empty .pi {
        font-size: 2rem;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 0.9rem;
      }
      .card {
        display: flex;
        flex-direction: column;
        padding: 0;
        overflow: hidden;
        color: var(--z-fg);
        transition: box-shadow 0.15s ease;
      }
      .card:hover {
        box-shadow: 0 4px 14px rgba(13, 27, 42, 0.1);
      }
      .card.out {
        opacity: 0.55;
      }
      .img-wrap {
        position: relative;
        aspect-ratio: 1;
        background: var(--z-bg);
      }
      .img-wrap img {
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
        font-size: 2rem;
      }
      .badge {
        position: absolute;
        bottom: 8px;
        left: 8px;
        font-size: 0.68rem;
        font-weight: 600;
        padding: 0.2rem 0.55rem;
        border-radius: 999px;
        color: #fff;
      }
      .badge-warn {
        background: var(--z-warning);
      }
      .badge-out {
        background: var(--z-fg-muted);
      }
      .info {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        padding: 0.7rem 0.8rem 0.9rem;
      }
      .name {
        font-weight: 600;
        font-size: 0.88rem;
        line-height: 1.3;
      }
      .desc {
        font-size: 0.75rem;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .price-row {
        display: flex;
        align-items: baseline;
        flex-wrap: wrap;
        gap: 0.35rem;
        margin-top: 0.25rem;
      }
      .price-row s {
        font-size: 0.75rem;
      }
      .unit {
        font-size: 0.72rem;
      }
      .more {
        display: flex;
        justify-content: center;
        margin-top: 1.5rem;
      }
    `,
  ],
})
export class HomePage implements OnInit {
  private api = inject(StoreApi);
  private route = inject(ActivatedRoute);

  protected readonly categories = signal<CategoryCard[]>([]);
  protected readonly products = signal<ProductCard[]>([]);
  protected readonly categoryId = signal<number | null>(null);
  protected readonly q = signal<string>('');
  protected readonly loading = signal(false);
  protected readonly total = signal(0);

  private page = 0;
  private totalPages = 0;
  protected readonly hasMore = computed(
    () => this.products().length > 0 && this.page + 1 < this.totalPages,
  );

  ngOnInit(): void {
    this.api.categories().subscribe((cats) => this.categories.set(cats));
    this.route.queryParamMap.subscribe((params) => {
      this.q.set(params.get('q') ?? '');
      this.reload();
    });
  }

  protected img(id: number | null): string | null {
    return imageUrl(id, 'thumb');
  }

  protected selectCategory(id: number | null): void {
    this.categoryId.set(id);
    this.reload();
  }

  protected loadMore(): void {
    this.fetch(this.page + 1);
  }

  private reload(): void {
    this.products.set([]);
    this.fetch(0);
  }

  private fetch(page: number): void {
    this.loading.set(true);
    this.api
      .products({
        q: this.q() || undefined,
        categoryId: this.categoryId() ?? undefined,
        page,
        size: 12,
      })
      .subscribe({
        next: (result) => {
          this.page = result.number;
          this.totalPages = result.totalPages;
          this.total.set(result.totalElements);
          this.products.set(
            page === 0 ? result.content : [...this.products(), ...result.content],
          );
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}
