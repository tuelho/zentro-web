import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AdminApi,
  ORDER_NEXT_STATUSES,
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  OrderResponse,
  OrderStatus,
} from '@zentro/shared';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { AddressSnapshot, errMessage, orderSeverity, parseSnapshot } from '../core/ui';

@Component({
  selector: 'app-pedidos',
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    TagModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
  ],
  template: `
    <div class="page">
      <div class="page-head">
        <h1 class="page-title">Pedidos</h1>
        <span class="grow"></span>
        <input
          pInputText
          type="text"
          placeholder="Buscar por código ou cliente..."
          [(ngModel)]="q"
          (keyup.enter)="reload()"
          style="min-width: 260px"
        />
        <p-button icon="pi pi-search" (onClick)="reload()" [outlined]="true" />
      </div>

      <div class="status-chips">
        <button
          type="button"
          class="status-chip"
          [class.active]="statusFilter() === null"
          (click)="setStatus(null)"
        >
          Todos <span class="count">{{ totalCount() }}</span>
        </button>
        @for (s of statuses; track s) {
          <button
            type="button"
            class="status-chip"
            [class.active]="statusFilter() === s"
            (click)="setStatus(s)"
          >
            {{ labels[s] }} <span class="count">{{ counts()[s] ?? 0 }}</span>
          </button>
        }
      </div>

      <div class="z-card" style="padding: 0.4rem">
        <p-table
          [value]="orders()"
          [lazy]="true"
          (onLazyLoad)="load($event)"
          [paginator]="true"
          [rows]="rows"
          [totalRecords]="total()"
          [loading]="loading()"
          dataKey="id"
          selectionMode="single"
          (onRowSelect)="open($any($event.data))"
        >
          <ng-template #header>
            <tr>
              <th>Código</th>
              <th>Data</th>
              <th>Cliente</th>
              <th>Tipo</th>
              <th style="text-align:right">Total</th>
              <th>Status</th>
            </tr>
          </ng-template>
          <ng-template #body let-o>
            <tr class="row-click" [pSelectableRow]="o">
              <td><strong>{{ o.code }}</strong></td>
              <td>{{ o.createdAt | date: 'dd/MM/yyyy HH:mm' }}</td>
              <td>{{ o.customer?.name ?? '—' }}</td>
              <td>{{ o.deliveryType === 'ENTREGA' ? 'Entrega' : 'Retirada' }}</td>
              <td style="text-align:right">{{ o.total | currency: 'BRL' }}</td>
              <td>
                <p-tag [value]="labels[o.status] ?? o.status" [severity]="severity(o.status)" />
              </td>
            </tr>
          </ng-template>
          <ng-template #emptymessage>
            <tr>
              <td colspan="6" class="z-muted" style="text-align:center; padding: 1.4rem">
                Nenhum pedido encontrado.
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>
    </div>

    <p-dialog
      [header]="'Pedido ' + (selected()?.code ?? '')"
      [(visible)]="dialogVisible"
      [modal]="true"
      [style]="{ width: '760px', maxWidth: '95vw' }"
      [dismissableMask]="true"
    >
      @if (selected(); as o) {
        <div class="detail-grid">
          <div class="detail-block">
            <h4>Cliente</h4>
            <div class="kv">
              <span><strong>{{ o.customer?.name ?? 'Não informado' }}</strong></span>
              @if (o.customer?.email) {
                <span class="z-muted">{{ o.customer?.email }}</span>
              }
              @if (o.customer?.phone) {
                <span class="z-muted"><i class="pi pi-phone"></i> {{ o.customer?.phone }}</span>
              }
              @if (o.customerNote) {
                <span><em>Obs.: {{ o.customerNote }}</em></span>
              }
              @if (o.paymentMethodNote) {
                <span>Pagamento: {{ o.paymentMethodNote }}</span>
              }
            </div>
          </div>

          <div class="detail-block">
            <h4>{{ o.deliveryType === 'ENTREGA' ? 'Endereço de entrega' : 'Retirada na loja' }}</h4>
            @if (address(); as a) {
              <div class="kv">
                <span>{{ a.street }}{{ a.number ? ', ' + a.number : '' }}</span>
                <span>{{ a.district }}{{ a.city ? ' — ' + a.city : '' }}</span>
                @if (a.reference) {
                  <span class="z-muted">Ref.: {{ a.reference }}</span>
                }
                @if (a.latitude != null && a.longitude != null) {
                  <span style="display:flex; gap: 0.4rem; margin-top: 0.3rem">
                    <a
                      [href]="'https://www.google.com/maps?q=' + a.latitude + ',' + a.longitude"
                      target="_blank"
                    >
                      <i class="pi pi-map-marker"></i> Google Maps
                    </a>
                    <a
                      [href]="
                        'https://waze.com/ul?ll=' +
                        a.latitude + ',' + a.longitude +
                        '&navigate=yes'
                      "
                      target="_blank"
                    >
                      <i class="pi pi-compass"></i> Waze
                    </a>
                  </span>
                }
              </div>
            } @else {
              <p class="z-muted" style="margin:0">
                {{ o.deliveryType === 'ENTREGA' ? 'Sem endereço registrado.' : 'Cliente retira no balcão.' }}
              </p>
            }
          </div>
        </div>

        <div class="detail-block" style="margin-top: 1rem">
          <h4>Itens</h4>
          <table class="simple-table">
            <thead>
              <tr>
                <th>Produto</th>
                <th class="num">Qtd</th>
                <th class="num">Preço</th>
                <th class="num">Total</th>
              </tr>
            </thead>
            <tbody>
              @for (i of o.items; track $index) {
                <tr>
                  <td>
                    {{ i.productName }}
                    @if (i.variantName) {
                      <span class="z-muted"> — {{ i.variantName }}</span>
                    }
                  </td>
                  <td class="num">{{ i.qty | number: '1.0-2' }}</td>
                  <td class="num">{{ i.unitPrice | currency: 'BRL' }}</td>
                  <td class="num">{{ i.total | currency: 'BRL' }}</td>
                </tr>
              }
              <tr>
                <td colspan="3" class="num z-muted">Subtotal</td>
                <td class="num">{{ o.subtotal | currency: 'BRL' }}</td>
              </tr>
              @if (o.discount > 0) {
                <tr>
                  <td colspan="3" class="num z-muted">Desconto</td>
                  <td class="num">-{{ o.discount | currency: 'BRL' }}</td>
                </tr>
              }
              @if (o.deliveryFee > 0) {
                <tr>
                  <td colspan="3" class="num z-muted">Taxa de entrega</td>
                  <td class="num">{{ o.deliveryFee | currency: 'BRL' }}</td>
                </tr>
              }
              <tr class="totals">
                <td colspan="3" class="num">Total</td>
                <td class="num">{{ o.total | currency: 'BRL' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        @if (o.history.length > 0) {
          <div class="detail-block" style="margin-top: 1rem">
            <h4>Histórico</h4>
            <ul class="timeline">
              @for (h of o.history; track $index) {
                <li>
                  <div class="t-title">{{ labels[h.toStatus] ?? h.toStatus }}</div>
                  <div class="t-meta">
                    {{ h.changedAt | date: 'dd/MM/yyyy HH:mm' }}
                    @if (h.changedBy) {
                      · {{ h.changedBy }}
                    }
                    @if (h.note) {
                      · {{ h.note }}
                    }
                  </div>
                </li>
              }
            </ul>
          </div>
        }

        @if (nextStatuses().length > 0) {
          <div class="field" style="margin-top: 0.8rem">
            <label for="note">Nota (opcional, registrada no histórico)</label>
            <input pInputText id="note" type="text" [(ngModel)]="note" />
          </div>
          <div class="order-actions">
            @for (s of nextStatuses(); track s) {
              <p-button
                [label]="labels[s] ?? s"
                [severity]="s === 'CANCELADO' ? 'danger' : s === 'ENTREGUE' ? 'success' : 'primary'"
                [outlined]="s === 'CANCELADO'"
                [loading]="changing()"
                (onClick)="changeTo(o, s)"
              />
            }
          </div>
        }
      }
    </p-dialog>
  `,
})
export class PedidosPage implements OnInit {
  private api = inject(AdminApi);
  private toast = inject(MessageService);
  private confirm = inject(ConfirmationService);

  readonly statuses = ORDER_STATUSES;
  readonly labels = ORDER_STATUS_LABELS;
  readonly severity = orderSeverity;
  readonly rows = 15;

  readonly orders = signal<OrderResponse[]>([]);
  readonly total = signal(0);
  readonly counts = signal<Record<string, number>>({});
  readonly totalCount = signal(0);
  readonly loading = signal(false);
  readonly statusFilter = signal<string | null>(null);
  readonly selected = signal<OrderResponse | null>(null);
  readonly address = signal<AddressSnapshot | null>(null);
  readonly nextStatuses = signal<OrderStatus[]>([]);
  readonly changing = signal(false);

  q = '';
  note = '';
  dialogVisible = false;
  private page = 0;

  ngOnInit(): void {
    this.loadCounts();
    this.fetch();
  }

  load(event: TableLazyLoadEvent): void {
    this.page = Math.floor((event.first ?? 0) / (event.rows ?? this.rows));
    this.fetch();
  }

  setStatus(s: string | null): void {
    this.statusFilter.set(this.statusFilter() === s ? null : s);
    this.page = 0;
    this.fetch();
  }

  reload(): void {
    this.page = 0;
    this.fetch();
    this.loadCounts();
  }

  private loadCounts(): void {
    this.api.orderCounts().subscribe((c) => {
      this.counts.set(c);
      this.totalCount.set(Object.values(c).reduce((a, b) => a + b, 0));
    });
  }

  private fetch(): void {
    this.loading.set(true);
    this.api
      .orders({
        status: this.statusFilter() ?? undefined,
        q: this.q || undefined,
        page: this.page,
        size: this.rows,
      })
      .subscribe({
        next: (p) => {
          this.orders.set(p.content);
          this.total.set(p.totalElements);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.toast.add({ severity: 'error', summary: 'Erro', detail: errMessage(err) });
        },
      });
  }

  open(order: OrderResponse): void {
    this.note = '';
    this.setSelected(order);
    this.dialogVisible = true;
  }

  private setSelected(order: OrderResponse): void {
    this.selected.set(order);
    this.address.set(parseSnapshot(order.addressSnapshot));
    this.nextStatuses.set(ORDER_NEXT_STATUSES[order.status] ?? []);
  }

  changeTo(order: OrderResponse, status: OrderStatus): void {
    if (status === 'CANCELADO') {
      this.confirm.confirm({
        header: 'Cancelar pedido',
        message: `Tem certeza que deseja cancelar o pedido ${order.code}? O estoque será devolvido.`,
        icon: 'pi pi-exclamation-triangle',
        acceptButtonProps: { label: 'Cancelar pedido', severity: 'danger' },
        rejectButtonProps: { label: 'Voltar', severity: 'secondary', outlined: true },
        accept: () => this.doChange(order, status),
      });
    } else {
      this.doChange(order, status);
    }
  }

  private doChange(order: OrderResponse, status: OrderStatus): void {
    this.changing.set(true);
    this.api.changeStatus(order.id, status, this.note || undefined).subscribe({
      next: (updated) => {
        this.changing.set(false);
        this.note = '';
        this.setSelected(updated);
        this.toast.add({
          severity: 'success',
          summary: 'Status atualizado',
          detail: `${updated.code} → ${ORDER_STATUS_LABELS[updated.status] ?? updated.status}`,
        });
        this.fetch();
        this.loadCounts();
      },
      error: (err) => {
        this.changing.set(false);
        this.toast.add({ severity: 'error', summary: 'Erro', detail: errMessage(err) });
      },
    });
  }
}
