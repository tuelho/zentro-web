import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ORDER_STATUS_LABELS, OrderResponse, StoreApi } from '@zentro/shared';

import { StoreService } from '../services/store.service';

@Component({
  selector: 'app-order-page',
  imports: [CurrencyPipe, DatePipe, RouterLink],
  template: `
    @if (order(); as o) {
      @if (justPlaced()) {
        <div class="success-banner">
          <i class="pi pi-check-circle"></i>
          <div>
            <strong>Pedido realizado com sucesso!</strong>
            <p>Guarde o código <strong>{{ o.code }}</strong> para acompanhar por aqui.</p>
          </div>
        </div>
      }

      <div class="head">
        <div>
          <h1>Pedido {{ o.code }}</h1>
          <p class="z-muted">
            {{ o.createdAt | date: "dd/MM/yyyy 'às' HH:mm" }} ·
            {{ o.deliveryType === 'ENTREGA' ? 'Entrega' : 'Retirada na loja' }}
          </p>
        </div>
        <span class="status" [class.cancelled]="o.status === 'CANCELADO'">
          {{ label(o.status) }}
        </span>
      </div>

      <div class="layout">
        <section class="z-card">
          <h2>Acompanhamento</h2>
          <ul class="timeline">
            @for (h of timeline(); track $index) {
              <li [class.last]="$last">
                <span class="marker"></span>
                <div>
                  <strong>{{ label(h.toStatus) }}</strong>
                  @if (h.changedAt) {
                    <span class="z-muted when">
                      {{ h.changedAt | date: 'dd/MM/yyyy HH:mm' }}
                    </span>
                  }
                  @if (h.note) {
                    <p class="note z-muted">{{ h.note }}</p>
                  }
                </div>
              </li>
            }
          </ul>

          @if (whatsappLink(); as link) {
            <a class="wa-btn" [href]="link" target="_blank" rel="noopener">
              <i class="pi pi-whatsapp"></i>
              Falar com a loja no WhatsApp
            </a>
          }
        </section>

        <section class="z-card">
          <h2>Itens</h2>
          <div class="items">
            @for (item of o.items; track $index) {
              <div class="item">
                <span>
                  {{ item.qty }}x {{ item.productName }}
                  @if (item.variantName) {
                    <span class="z-muted">({{ item.variantName }})</span>
                  }
                </span>
                <span>{{ item.total | currency: 'BRL' }}</span>
              </div>
            }
          </div>
          <div class="totals">
            <div class="row">
              <span>Subtotal</span>
              <span>{{ o.subtotal | currency: 'BRL' }}</span>
            </div>
            @if (o.discount > 0) {
              <div class="row">
                <span>Desconto</span>
                <span>-{{ o.discount | currency: 'BRL' }}</span>
              </div>
            }
            <div class="row">
              <span>{{ o.deliveryType === 'ENTREGA' ? 'Taxa de entrega' : 'Retirada' }}</span>
              <span>{{ o.deliveryFee | currency: 'BRL' }}</span>
            </div>
            <div class="row total">
              <span>Total</span>
              <span class="z-price">{{ o.total | currency: 'BRL' }}</span>
            </div>
          </div>

          @if (address(); as addr) {
            <h2 class="mt">Endereço</h2>
            <p class="z-muted snap">{{ formatAddress(addr) }}</p>
            @if (addr['reference']) {
              <p class="z-muted snap"><strong>Referência:</strong> {{ addr['reference'] }}</p>
            }
          }
          @if (o.paymentMethodNote) {
            <h2 class="mt">Pagamento</h2>
            <p class="z-muted snap">{{ o.paymentMethodNote }}</p>
          }
          @if (o.customerNote) {
            <h2 class="mt">Observação</h2>
            <p class="z-muted snap">{{ o.customerNote }}</p>
          }
        </section>
      </div>
    } @else if (error()) {
      <div class="missing z-card">
        <i class="pi pi-search"></i>
        <p>Não encontramos este pedido. Confira o código e tente novamente.</p>
        <a routerLink="/">Voltar para a loja</a>
      </div>
    }
  `,
  styles: [
    `
      .success-banner {
        display: flex;
        gap: 0.8rem;
        align-items: center;
        background: color-mix(in srgb, var(--z-green) 14%, transparent);
        border: 1px solid var(--z-green);
        border-radius: var(--z-radius);
        padding: 0.9rem 1rem;
        margin-bottom: 1rem;
      }
      .success-banner .pi {
        font-size: 1.8rem;
        color: var(--z-green);
      }
      .success-banner p {
        margin: 0.15rem 0 0;
        font-size: 0.85rem;
      }
      .head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
        margin-bottom: 1rem;
        flex-wrap: wrap;
      }
      h1 {
        font-size: 1.3rem;
        margin: 0;
      }
      .head p {
        margin: 0.2rem 0 0;
        font-size: 0.82rem;
      }
      .status {
        background: var(--z-blue);
        color: #fff;
        font-size: 0.78rem;
        font-weight: 600;
        padding: 0.3rem 0.8rem;
        border-radius: 999px;
      }
      .status.cancelled {
        background: var(--z-danger);
      }
      .layout {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1rem;
        align-items: start;
      }
      @media (min-width: 760px) {
        .layout {
          grid-template-columns: 1fr 1fr;
        }
      }
      h2 {
        font-size: 0.95rem;
        margin: 0 0 0.75rem;
      }
      .mt {
        margin-top: 1rem;
      }
      .timeline {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .timeline li {
        position: relative;
        padding: 0 0 1.1rem 1.6rem;
        font-size: 0.86rem;
      }
      .timeline li::before {
        content: '';
        position: absolute;
        left: 6px;
        top: 14px;
        bottom: -4px;
        width: 2px;
        background: var(--z-gray);
      }
      .timeline li.last::before {
        display: none;
      }
      .marker {
        position: absolute;
        left: 0;
        top: 3px;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: var(--z-green);
        border: 3px solid color-mix(in srgb, var(--z-green) 30%, transparent);
        box-sizing: content-box;
        margin-left: -3px;
      }
      .when {
        display: block;
        font-size: 0.75rem;
      }
      .note {
        margin: 0.2rem 0 0;
        font-size: 0.78rem;
      }
      .wa-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        background: #25d366;
        color: #fff;
        font-weight: 600;
        font-size: 0.85rem;
        border-radius: 999px;
        padding: 0.55rem 1.1rem;
        margin-top: 0.5rem;
      }
      .items {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        margin-bottom: 0.8rem;
      }
      .item {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        font-size: 0.86rem;
      }
      .totals {
        border-top: 1px solid var(--z-gray);
        padding-top: 0.6rem;
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
      }
      .totals .row {
        display: flex;
        justify-content: space-between;
        font-size: 0.85rem;
      }
      .totals .total {
        font-weight: 700;
        font-size: 1rem;
        margin-top: 0.25rem;
      }
      .snap {
        margin: 0;
        font-size: 0.85rem;
        white-space: pre-line;
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
export class OrderPage implements OnInit {
  private api = inject(StoreApi);
  private route = inject(ActivatedRoute);
  private storeSvc = inject(StoreService);

  protected readonly order = signal<OrderResponse | null>(null);
  protected readonly error = signal(false);
  protected readonly justPlaced = signal(false);

  protected readonly timeline = computed(() => {
    const o = this.order();
    if (!o) return [];
    return [...o.history].sort((a, b) =>
      (a.changedAt ?? '').localeCompare(b.changedAt ?? ''),
    );
  });

  protected readonly address = computed<Record<string, string | null> | null>(() => {
    const raw = this.order()?.addressSnapshot;
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });

  protected formatAddress(addr: Record<string, string | null>): string {
    const parts = [addr['street'], addr['number'], addr['district'], addr['city'], addr['state']]
      .filter((p) => !!p);
    return parts.length > 0 ? parts.join(', ') : 'Local marcado no mapa';
  }

  protected readonly whatsappLink = computed(() => {
    const phone = (this.storeSvc.store()?.whatsapp ?? '').replace(/\D/g, '');
    const code = this.order()?.code;
    if (!phone || !code) return null;
    return `https://wa.me/${phone}?text=${encodeURIComponent('Olá! Pedido ' + code)}`;
  });

  ngOnInit(): void {
    this.justPlaced.set(this.route.snapshot.queryParamMap.has('sucesso'));
    this.route.paramMap.subscribe((params) => {
      const code = params.get('code')!;
      this.api.track(code).subscribe({
        next: (o) => this.order.set(o),
        error: () => this.error.set(true),
      });
    });
  }

  protected label(status: string): string {
    return ORDER_STATUS_LABELS[status] ?? status;
  }
}
