import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi, CustomerDetail, CustomerRow, ORDER_STATUS_LABELS } from '@zentro/shared';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { orderSeverity } from '../core/ui';

@Component({
  selector: 'app-clientes',
  imports: [CommonModule, FormsModule, TableModule, TagModule, DialogModule, ButtonModule, InputTextModule],
  template: `
    <div class="page">
      <div class="page-head">
        <h1 class="page-title">Clientes</h1>
        <span class="grow"></span>
        <input
          pInputText
          type="text"
          placeholder="Buscar por nome, e-mail ou telefone..."
          [(ngModel)]="q"
          (keyup.enter)="reload()"
          style="min-width: 280px"
        />
        <p-button icon="pi pi-search" [outlined]="true" (onClick)="reload()" />
      </div>

      <div class="z-card" style="padding: 0.4rem">
        <p-table
          [value]="customers()"
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
              <th>Nome</th>
              <th>E-mail</th>
              <th>Telefone</th>
              <th>Cadastrado em</th>
            </tr>
          </ng-template>
          <ng-template #body let-c>
            <tr class="row-click" [pSelectableRow]="c">
              <td><strong>{{ c.name }}</strong></td>
              <td>{{ c.email }}</td>
              <td>{{ c.phone ?? '—' }}</td>
              <td>{{ c.createdAt | date: 'dd/MM/yyyy' }}</td>
            </tr>
          </ng-template>
          <ng-template #emptymessage>
            <tr>
              <td colspan="4" class="z-muted" style="text-align:center; padding: 1.4rem">
                Nenhum cliente encontrado.
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>
    </div>

    <p-dialog
      [header]="detail()?.customer?.name ?? 'Cliente'"
      [(visible)]="dialogVisible"
      [modal]="true"
      [style]="{ width: '680px', maxWidth: '95vw' }"
      [dismissableMask]="true"
    >
      @if (detail(); as d) {
        <div class="kv" style="margin-bottom: 1rem">
          <span><i class="pi pi-envelope"></i> {{ d.customer.email }}</span>
          @if (d.customer.phone) {
            <span><i class="pi pi-phone"></i> {{ d.customer.phone }}</span>
          }
          <span class="z-muted">Cadastrado em {{ d.customer.createdAt | date: 'dd/MM/yyyy' }}</span>
        </div>

        <div class="detail-block">
          <h4>Endereços</h4>
          @if (d.addresses.length === 0) {
            <p class="z-muted" style="margin:0">Nenhum endereço cadastrado.</p>
          }
          @for (a of d.addresses; track a.id) {
            <div class="kv" style="margin-bottom: 0.7rem">
              <span>
                <strong>{{ a.label || 'Endereço' }}</strong>
                @if (a.isDefault) {
                  <p-tag value="padrão" severity="info" style="margin-left: 0.4rem" />
                }
              </span>
              <span>{{ a.street }}{{ a.number ? ', ' + a.number : '' }} — {{ a.district }} {{ a.city ? '· ' + a.city : '' }}</span>
              @if (a.reference) {
                <span class="z-muted">Ref.: {{ a.reference }}</span>
              }
              <span>
                <a
                  [href]="'https://www.google.com/maps?q=' + a.latitude + ',' + a.longitude"
                  target="_blank"
                >
                  <i class="pi pi-map-marker"></i> Ver no mapa
                </a>
              </span>
            </div>
          }
        </div>

        <div class="detail-block" style="margin-top: 1rem">
          <h4>Últimos pedidos</h4>
          @if (d.orders.length === 0) {
            <p class="z-muted" style="margin:0">Nenhum pedido.</p>
          } @else {
            <table class="simple-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Data</th>
                  <th class="num">Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                @for (o of d.orders; track o.id) {
                  <tr>
                    <td><strong>{{ o.code }}</strong></td>
                    <td>{{ o.createdAt | date: 'dd/MM/yyyy HH:mm' }}</td>
                    <td class="num">{{ o.total | currency: 'BRL' }}</td>
                    <td>
                      <p-tag [value]="labels[o.status] ?? o.status" [severity]="severity(o.status)" />
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      }
    </p-dialog>
  `,
})
export class ClientesPage implements OnInit {
  private api = inject(AdminApi);

  readonly rows = 15;
  readonly labels = ORDER_STATUS_LABELS;
  readonly severity = orderSeverity;

  readonly customers = signal<CustomerRow[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly detail = signal<CustomerDetail | null>(null);

  q = '';
  dialogVisible = false;
  private page = 0;

  ngOnInit(): void {
    this.fetch();
  }

  load(event: TableLazyLoadEvent): void {
    this.page = Math.floor((event.first ?? 0) / (event.rows ?? this.rows));
    this.fetch();
  }

  reload(): void {
    this.page = 0;
    this.fetch();
  }

  private fetch(): void {
    this.loading.set(true);
    this.api.customers(this.q, this.page).subscribe({
      next: (p) => {
        this.customers.set(p.content);
        this.total.set(p.totalElements);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  open(c: CustomerRow): void {
    this.detail.set(null);
    this.dialogVisible = true;
    this.api.customer(c.id).subscribe((d) => this.detail.set(d));
  }
}
