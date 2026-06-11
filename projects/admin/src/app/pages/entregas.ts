import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AdminApi,
  DeliveryView,
  MapPin,
  ORDER_NEXT_STATUSES,
  ORDER_STATUS_LABELS,
  OrderStatus,
  ZMap,
} from '@zentro/shared';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { errMessage, orderSeverity, parseSnapshot } from '../core/ui';

@Component({
  selector: 'app-entregas',
  imports: [CommonModule, FormsModule, ZMap, TagModule, ButtonModule, DialogModule, InputTextModule],
  template: `
    <div class="page">
      <h1 class="page-title">Entregas</h1>

      <div class="deliveries-grid">
        <div class="z-card">
          <h3 class="card-title">Pendentes ({{ deliveries().length }})</h3>
          @if (deliveries().length === 0) {
            <p class="z-muted">Nenhuma entrega pendente. 🎉</p>
          }
          @for (d of deliveries(); track d.orderId) {
            <div class="delivery-item">
              <div class="delivery-head">
                <span class="code">{{ d.orderCode }}</span>
                <p-tag [value]="labels[d.status] ?? d.status" [severity]="severity(d.status)" />
                <span class="grow" style="flex:1"></span>
                <strong>{{ d.total | currency: 'BRL' }}</strong>
              </div>
              <div>
                {{ d.customerName }}
                @if (d.customerPhone) {
                  <span class="z-muted"> · <i class="pi pi-phone"></i> {{ d.customerPhone }}</span>
                }
              </div>
              @if (reference(d); as ref) {
                <div class="muted-sm"><i class="pi pi-map-marker"></i> Ref.: {{ ref }}</div>
              }
              <div class="muted-sm">
                Entregador: {{ d.courierName || 'não definido' }}
                @if (d.notes) {
                  · Obs.: {{ d.notes }}
                }
              </div>
              <div class="delivery-actions">
                <p-button
                  icon="pi pi-user-edit"
                  label="Entregador"
                  size="small"
                  [outlined]="true"
                  (onClick)="openCourier(d)"
                />
                @if (d.latitude != null && d.longitude != null) {
                  <a
                    [href]="'https://www.google.com/maps?q=' + d.latitude + ',' + d.longitude"
                    target="_blank"
                  >
                    <p-button icon="pi pi-map" label="Maps" size="small" [text]="true" />
                  </a>
                  <a
                    [href]="'https://waze.com/ul?ll=' + d.latitude + ',' + d.longitude + '&navigate=yes'"
                    target="_blank"
                  >
                    <p-button icon="pi pi-compass" label="Waze" size="small" [text]="true" />
                  </a>
                }
                @if (canGo(d, 'SAIU_PARA_ENTREGA')) {
                  <p-button
                    icon="pi pi-truck"
                    label="Saiu p/ entrega"
                    size="small"
                    severity="warn"
                    (onClick)="changeStatus(d, 'SAIU_PARA_ENTREGA')"
                  />
                }
                @if (canGo(d, 'ENTREGUE')) {
                  <p-button
                    icon="pi pi-check"
                    label="Entregue"
                    size="small"
                    severity="success"
                    (onClick)="changeStatus(d, 'ENTREGUE')"
                  />
                }
              </div>
            </div>
          }
        </div>

        <div class="z-card map-card">
          <z-map [pins]="pins()" [readonly]="true" />
        </div>
      </div>
    </div>

    <p-dialog
      header="Entrega — entregador e observações"
      [(visible)]="courierVisible"
      [modal]="true"
      [style]="{ width: '420px', maxWidth: '95vw' }"
    >
      <div class="form-grid">
        <div class="field f-12">
          <label for="courier">Entregador</label>
          <input pInputText id="courier" type="text" [(ngModel)]="courierName" />
        </div>
        <div class="field f-12">
          <label for="notes">Observações</label>
          <input pInputText id="notes" type="text" [(ngModel)]="notes" />
        </div>
      </div>
      <div class="dialog-footer">
        <p-button label="Cancelar" severity="secondary" [text]="true" (onClick)="courierVisible = false" />
        <p-button label="Salvar" [loading]="saving()" (onClick)="saveCourier()" />
      </div>
    </p-dialog>
  `,
})
export class EntregasPage implements OnInit {
  private api = inject(AdminApi);
  private toast = inject(MessageService);

  readonly labels = ORDER_STATUS_LABELS;
  readonly severity = orderSeverity;

  readonly deliveries = signal<DeliveryView[]>([]);
  readonly saving = signal(false);
  readonly pins = computed<MapPin[]>(() =>
    this.deliveries()
      .filter((d) => d.latitude != null && d.longitude != null)
      .map((d) => ({
        lat: d.latitude!,
        lng: d.longitude!,
        label: `${d.orderCode} — ${d.customerName}`,
      })),
  );

  courierVisible = false;
  courierName = '';
  notes = '';
  private editing: DeliveryView | null = null;

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.api.deliveries().subscribe((list) => this.deliveries.set(list));
  }

  reference(d: DeliveryView): string | null {
    return parseSnapshot(d.addressSnapshot)?.reference ?? null;
  }

  canGo(d: DeliveryView, status: OrderStatus): boolean {
    return (ORDER_NEXT_STATUSES[d.status] ?? []).includes(status);
  }

  openCourier(d: DeliveryView): void {
    this.editing = d;
    this.courierName = d.courierName ?? '';
    this.notes = d.notes ?? '';
    this.courierVisible = true;
  }

  saveCourier(): void {
    if (!this.editing) return;
    this.saving.set(true);
    this.api
      .updateDelivery(this.editing.orderId, {
        courierName: this.courierName || undefined,
        notes: this.notes || undefined,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.courierVisible = false;
          this.toast.add({ severity: 'success', summary: 'Entrega atualizada' });
          this.reload();
        },
        error: (err) => {
          this.saving.set(false);
          this.toast.add({ severity: 'error', summary: 'Erro', detail: errMessage(err) });
        },
      });
  }

  changeStatus(d: DeliveryView, status: OrderStatus): void {
    this.api.changeStatus(d.orderId, status).subscribe({
      next: () => {
        this.toast.add({
          severity: 'success',
          summary: 'Status atualizado',
          detail: `${d.orderCode} → ${ORDER_STATUS_LABELS[status]}`,
        });
        this.reload();
      },
      error: (err) =>
        this.toast.add({ severity: 'error', summary: 'Erro', detail: errMessage(err) }),
    });
  }
}
