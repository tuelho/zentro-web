import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi, SalesRow } from '@zentro/shared';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { errMessage, isoDate } from '../core/ui';

type GroupBy = 'day' | 'product' | 'category';

@Component({
  selector: 'app-relatorios',
  imports: [CommonModule, FormsModule, TableModule, ButtonModule, SelectModule, DatePickerModule],
  template: `
    <div class="page">
      <h1 class="page-title">Relatórios de vendas</h1>

      <div class="z-card">
        <div class="form-grid">
          <div class="field f-3">
            <label for="rfrom">De</label>
            <p-datepicker inputId="rfrom" [(ngModel)]="from" dateFormat="dd/mm/yy" [showIcon]="true" />
          </div>
          <div class="field f-3">
            <label for="rto">Até</label>
            <p-datepicker inputId="rto" [(ngModel)]="to" dateFormat="dd/mm/yy" [showIcon]="true" />
          </div>
          <div class="field f-3">
            <label for="rgroup">Agrupar por</label>
            <p-select
              inputId="rgroup"
              [options]="groupOptions"
              optionLabel="label"
              optionValue="value"
              [(ngModel)]="groupBy"
            />
          </div>
          <div class="field-inline f-3" style="gap: 0.5rem">
            <p-button label="Gerar" icon="pi pi-refresh" [loading]="loading()" (onClick)="load()" />
            <p-button
              label="Exportar CSV"
              icon="pi pi-download"
              [outlined]="true"
              [loading]="exporting()"
              [disabled]="rows().length === 0"
              (onClick)="exportCsv()"
            />
          </div>
        </div>
      </div>

      <div class="z-card" style="padding: 0.4rem">
        <p-table [value]="rows()" [loading]="loading()">
          <ng-template #header>
            <tr>
              <th>{{ groupLabel() }}</th>
              <th style="text-align:right">Qtd</th>
              <th style="text-align:right">Vendas</th>
              <th style="text-align:right">Custo</th>
              <th style="text-align:right">Lucro</th>
            </tr>
          </ng-template>
          <ng-template #body let-r>
            <tr>
              <td>{{ groupBy === 'day' ? fmtDay(r.label) : r.label }}</td>
              <td style="text-align:right">{{ r.qty | number: '1.0-2' }}</td>
              <td style="text-align:right">{{ r.sales | currency: 'BRL' }}</td>
              <td style="text-align:right" class="z-muted">{{ r.cost | currency: 'BRL' }}</td>
              <td
                style="text-align:right"
                [style.color]="r.profit >= 0 ? 'var(--z-green)' : 'var(--z-danger)'"
              >
                <strong>{{ r.profit | currency: 'BRL' }}</strong>
              </td>
            </tr>
          </ng-template>
          <ng-template #footer>
            @if (rows().length > 0) {
              <tr>
                <td><strong>Totais</strong></td>
                <td style="text-align:right"><strong>{{ totals().qty | number: '1.0-2' }}</strong></td>
                <td style="text-align:right"><strong>{{ totals().sales | currency: 'BRL' }}</strong></td>
                <td style="text-align:right"><strong>{{ totals().cost | currency: 'BRL' }}</strong></td>
                <td style="text-align:right"><strong>{{ totals().profit | currency: 'BRL' }}</strong></td>
              </tr>
            }
          </ng-template>
          <ng-template #emptymessage>
            <tr>
              <td colspan="5" class="z-muted" style="text-align:center; padding: 1.4rem">
                Nenhuma venda no período.
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>
    </div>
  `,
})
export class RelatoriosPage implements OnInit {
  private api = inject(AdminApi);
  private http = inject(HttpClient);
  private toast = inject(MessageService);

  readonly groupOptions = [
    { label: 'Dia', value: 'day' as GroupBy },
    { label: 'Produto', value: 'product' as GroupBy },
    { label: 'Categoria', value: 'category' as GroupBy },
  ];

  readonly rows = signal<SalesRow[]>([]);
  readonly loading = signal(false);
  readonly exporting = signal(false);
  readonly totals = signal({ qty: 0, sales: 0, cost: 0, profit: 0 });

  from: Date = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  to: Date = new Date();
  groupBy: GroupBy = 'day';

  ngOnInit(): void {
    this.load();
  }

  groupLabel(): string {
    return this.groupOptions.find((g) => g.value === this.groupBy)?.label ?? 'Dia';
  }

  fmtDay(label: string): string {
    if (label?.length === 10) return `${label.slice(8, 10)}/${label.slice(5, 7)}/${label.slice(0, 4)}`;
    return label;
  }

  load(): void {
    if (!this.from || !this.to) return;
    this.loading.set(true);
    this.api.salesReport(isoDate(this.from), isoDate(this.to), this.groupBy).subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.totals.set({
          qty: rows.reduce((a, r) => a + r.qty, 0),
          sales: rows.reduce((a, r) => a + r.sales, 0),
          cost: rows.reduce((a, r) => a + r.cost, 0),
          profit: rows.reduce((a, r) => a + r.profit, 0),
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.add({ severity: 'error', summary: 'Erro', detail: errMessage(err) });
      },
    });
  }

  exportCsv(): void {
    const fromStr = isoDate(this.from);
    const toStr = isoDate(this.to);
    const url = this.api.salesReportCsvUrl(fromStr, toStr, this.groupBy);
    this.exporting.set(true);
    // baixa via HttpClient para enviar o JWT (window.open nao levaria o header)
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        this.exporting.set(false);
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = `vendas-${fromStr}-a-${toStr}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objectUrl);
      },
      error: (err) => {
        this.exporting.set(false);
        this.toast.add({ severity: 'error', summary: 'Erro ao exportar', detail: errMessage(err) });
      },
    });
  }
}
