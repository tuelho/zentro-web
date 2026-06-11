import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AdminApi,
  LowStockItem,
  MovementResponse,
  MovementType,
  ProductResponse,
} from '@zentro/shared';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { errMessage, movementSeverity } from '../core/ui';

const MOVEMENT_LABELS: Record<string, string> = {
  ENTRADA: 'Entrada',
  SAIDA: 'Saída',
  AJUSTE: 'Ajuste',
  VENDA: 'Venda',
  CANCELAMENTO: 'Cancelamento',
};

@Component({
  selector: 'app-estoque',
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    TagModule,
    ButtonModule,
    SelectModule,
    InputNumberModule,
    InputTextModule,
  ],
  template: `
    <div class="page">
      <h1 class="page-title">Estoque</h1>

      @if (lowStock().length > 0) {
        <div>
          <h3 class="card-title" style="color: var(--z-warning)">
            <i class="pi pi-exclamation-triangle"></i> Itens abaixo do mínimo
          </h3>
          <div class="low-stock-grid">
            @for (item of lowStock(); track item.productId + '-' + (item.variantId ?? 0)) {
              <div class="low-stock-card">
                <div class="name">{{ item.name }}</div>
                <div class="qty">{{ item.stockQty }} em estoque / mínimo {{ item.minStockAlert }}</div>
              </div>
            }
          </div>
        </div>
      }

      <div class="z-card">
        <h3 class="card-title">Registrar movimentação</h3>
        <div class="form-grid">
          <div class="field f-4">
            <label for="mprod">Produto *</label>
            <p-select
              inputId="mprod"
              [options]="products()"
              optionLabel="name"
              placeholder="Selecione o produto"
              [filter]="true"
              filterBy="name"
              [(ngModel)]="product"
              (onChange)="variant = null"
              appendTo="body"
            />
          </div>
          @if (product?.hasVariants) {
            <div class="field f-3">
              <label for="mvar">Variação *</label>
              <p-select
                inputId="mvar"
                [options]="product?.variants ?? []"
                optionLabel="name"
                placeholder="Selecione"
                [(ngModel)]="variant"
                appendTo="body"
              />
            </div>
          }
          <div class="field f-3">
            <label for="mtype">Tipo *</label>
            <p-select
              inputId="mtype"
              [options]="types"
              optionLabel="label"
              optionValue="value"
              [(ngModel)]="type"
              appendTo="body"
            />
          </div>
          <div class="field f-2">
            <label for="mqty">Quantidade *</label>
            <p-inputnumber inputId="mqty" [(ngModel)]="qty" [min]="1" />
          </div>
          <div class="field f-3">
            <label for="mreason">Motivo</label>
            <input pInputText id="mreason" type="text" [(ngModel)]="reason" />
          </div>
          <div class="field-inline f-2">
            <p-button
              label="Registrar"
              icon="pi pi-check"
              [loading]="saving()"
              [disabled]="!canSubmit()"
              (onClick)="submit()"
            />
          </div>
        </div>
      </div>

      <div class="z-card" style="padding: 0.4rem">
        <div class="page-head" style="padding: 0.6rem 0.8rem">
          <h3 class="card-title" style="margin: 0">Histórico de movimentações</h3>
          <span class="grow"></span>
          <p-select
            [options]="products()"
            optionLabel="name"
            optionValue="id"
            placeholder="Filtrar por produto"
            [filter]="true"
            filterBy="name"
            [showClear]="true"
            [(ngModel)]="filterProductId"
            (onChange)="reloadMovements()"
            style="min-width: 230px"
          />
        </div>
        <p-table
          [value]="movements()"
          [lazy]="true"
          (onLazyLoad)="loadMovements($event)"
          [paginator]="true"
          [rows]="rows"
          [totalRecords]="total()"
          [loading]="loading()"
          dataKey="id"
        >
          <ng-template #header>
            <tr>
              <th>Data</th>
              <th>Produto</th>
              <th>Tipo</th>
              <th style="text-align:right">Qtd</th>
              <th>Motivo</th>
              <th>Por</th>
            </tr>
          </ng-template>
          <ng-template #body let-m>
            <tr>
              <td>{{ m.createdAt | date: 'dd/MM/yyyy HH:mm' }}</td>
              <td>{{ productName(m) }}</td>
              <td>
                <p-tag [value]="typeLabel(m.type)" [severity]="severity(m.type)" />
              </td>
              <td style="text-align:right"><strong>{{ m.qty }}</strong></td>
              <td class="z-muted">
                {{ m.reason ?? '—' }}
                @if (m.orderId) {
                  <span> (pedido #{{ m.orderId }})</span>
                }
              </td>
              <td class="z-muted">{{ m.createdBy ?? '—' }}</td>
            </tr>
          </ng-template>
          <ng-template #emptymessage>
            <tr>
              <td colspan="6" class="z-muted" style="text-align:center; padding: 1.4rem">
                Nenhuma movimentação registrada.
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>
    </div>
  `,
})
export class EstoquePage implements OnInit {
  private api = inject(AdminApi);
  private toast = inject(MessageService);

  readonly rows = 15;
  readonly severity = movementSeverity;
  readonly types = [
    { label: 'Entrada', value: 'ENTRADA' as MovementType },
    { label: 'Saída', value: 'SAIDA' as MovementType },
    { label: 'Ajuste', value: 'AJUSTE' as MovementType },
  ];

  readonly lowStock = signal<LowStockItem[]>([]);
  readonly products = signal<ProductResponse[]>([]);
  readonly movements = signal<MovementResponse[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly saving = signal(false);

  product: ProductResponse | null = null;
  variant: { id: number; name: string } | null = null;
  type: MovementType = 'ENTRADA';
  qty: number | null = null;
  reason = '';
  filterProductId: number | null = null;
  private page = 0;
  private productNames = new Map<number, string>();

  ngOnInit(): void {
    this.loadLowStock();
    this.api.products({ page: 0, size: 100 }).subscribe((p) => {
      this.products.set(p.content);
      this.productNames = new Map(p.content.map((x) => [x.id, x.name]));
    });
    this.fetchMovements();
  }

  loadLowStock(): void {
    this.api.lowStock().subscribe((list) => this.lowStock.set(list));
  }

  typeLabel(t: string): string {
    return MOVEMENT_LABELS[t] ?? t;
  }

  productName(m: MovementResponse): string {
    return this.productNames.get(m.productId) ?? `Produto #${m.productId}`;
  }

  canSubmit(): boolean {
    if (!this.product || !this.qty || this.qty <= 0) return false;
    if (this.product.hasVariants && !this.variant) return false;
    return true;
  }

  submit(): void {
    if (!this.canSubmit()) return;
    this.saving.set(true);
    this.api
      .move({
        productId: this.product!.id,
        variantId: this.variant?.id ?? null,
        type: this.type,
        qty: this.qty!,
        reason: this.reason || undefined,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.add({ severity: 'success', summary: 'Movimentação registrada' });
          this.qty = null;
          this.reason = '';
          this.reloadMovements();
          this.loadLowStock();
        },
        error: (err) => {
          this.saving.set(false);
          this.toast.add({ severity: 'error', summary: 'Erro', detail: errMessage(err) });
        },
      });
  }

  loadMovements(event: TableLazyLoadEvent): void {
    this.page = Math.floor((event.first ?? 0) / (event.rows ?? this.rows));
    this.fetchMovements();
  }

  reloadMovements(): void {
    this.page = 0;
    this.fetchMovements();
  }

  private fetchMovements(): void {
    this.loading.set(true);
    this.api.movements(this.filterProductId, this.page).subscribe({
      next: (p) => {
        this.movements.set(p.content);
        this.total.set(p.totalElements);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
