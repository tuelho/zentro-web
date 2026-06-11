import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminApi, Dashboard, ORDER_STATUS_LABELS } from '@zentro/shared';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';

const STATUS_COLORS: Record<string, string> = {
  NOVO: '#2563EB',
  CONFIRMADO: '#6366F1',
  EM_SEPARACAO: '#D97706',
  SAIU_PARA_ENTREGA: '#0EA5E9',
  PRONTO_PARA_RETIRADA: '#8B5CF6',
  ENTREGUE: '#00C896',
  CANCELADO: '#DC2626',
};

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink, ChartModule, TableModule],
  template: `
    <div class="page">
      <h1 class="page-title">Dashboard</h1>

      @if (data(); as d) {
        @if (d.lowStockCount > 0) {
          <div class="warn-banner">
            <i class="pi pi-exclamation-triangle"></i>
            <span>
              {{ d.lowStockCount }} item(ns) com estoque abaixo do mínimo.
              <a routerLink="/estoque">Ver estoque</a>
            </span>
          </div>
        }

        <div class="kpi-grid">
          <div class="kpi-card">
            <span class="kpi-icon green"><i class="pi pi-dollar"></i></span>
            <div>
              <div class="kpi-label">Vendas hoje</div>
              <div class="kpi-value">{{ d.today.sales | currency: 'BRL' }}</div>
            </div>
          </div>
          <div class="kpi-card">
            <span class="kpi-icon"><i class="pi pi-clipboard"></i></span>
            <div>
              <div class="kpi-label">Pedidos hoje</div>
              <div class="kpi-value">{{ d.today.orders }}</div>
            </div>
          </div>
          <div class="kpi-card">
            <span class="kpi-icon navy"><i class="pi pi-receipt"></i></span>
            <div>
              <div class="kpi-label">Ticket médio (hoje)</div>
              <div class="kpi-value">{{ d.today.avgTicket | currency: 'BRL' }}</div>
            </div>
          </div>
          <div class="kpi-card">
            <span class="kpi-icon green"><i class="pi pi-chart-line"></i></span>
            <div>
              <div class="kpi-label">Vendas no mês</div>
              <div class="kpi-value">{{ d.month.sales | currency: 'BRL' }}</div>
            </div>
          </div>
        </div>

        <div class="cards-grid-2">
          <div class="z-card">
            <h3 class="card-title">Vendas últimos 7 dias</h3>
            <p-chart type="line" [data]="lineData()" [options]="lineOptions" height="280px" />
          </div>
          <div class="z-card">
            <h3 class="card-title">Pedidos por status</h3>
            @if (hasStatusData()) {
              <p-chart
                type="doughnut"
                [data]="doughnutData()"
                [options]="doughnutOptions"
                height="280px"
              />
            } @else {
              <p class="z-muted">Sem pedidos ainda.</p>
            }
          </div>
        </div>

        <div class="z-card">
          <h3 class="card-title">Top 5 produtos do mês</h3>
          @if (d.topProducts.length > 0) {
            <table class="simple-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th class="num">Qtd</th>
                  <th class="num">Total</th>
                </tr>
              </thead>
              <tbody>
                @for (p of d.topProducts; track p.name) {
                  <tr>
                    <td>{{ p.name }}</td>
                    <td class="num">{{ p.qty | number: '1.0-2' }}</td>
                    <td class="num">{{ p.total | currency: 'BRL' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          } @else {
            <p class="z-muted">Nenhuma venda registrada no mês.</p>
          }
        </div>
      } @else {
        <p class="z-muted">Carregando...</p>
      }
    </div>
  `,
})
export class DashboardPage implements OnInit {
  private api = inject(AdminApi);

  readonly data = signal<Dashboard | null>(null);
  readonly lineData = signal<unknown>(null);
  readonly doughnutData = signal<unknown>(null);
  readonly hasStatusData = signal(false);

  readonly lineOptions = {
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } },
  };

  readonly doughnutOptions = {
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
  };

  ngOnInit(): void {
    this.api.dashboard().subscribe((d) => {
      this.data.set(d);
      this.buildCharts(d);
    });
  }

  private buildCharts(d: Dashboard): void {
    this.lineData.set({
      labels: d.last7Days.map((r) => this.fmtDay(r.day)),
      datasets: [
        {
          label: 'Vendas',
          data: d.last7Days.map((r) => r.sales),
          fill: true,
          tension: 0.35,
          borderColor: '#2563EB',
          backgroundColor: 'rgba(37, 99, 235, 0.12)',
          pointBackgroundColor: '#2563EB',
        },
      ],
    });

    const entries = Object.entries(d.ordersByStatus ?? {}).filter(([, v]) => v > 0);
    this.hasStatusData.set(entries.length > 0);
    this.doughnutData.set({
      labels: entries.map(([s]) => ORDER_STATUS_LABELS[s] ?? s),
      datasets: [
        {
          data: entries.map(([, v]) => v),
          backgroundColor: entries.map(([s]) => STATUS_COLORS[s] ?? '#94A3B8'),
        },
      ],
    });
  }

  private fmtDay(day: string): string {
    // backend envia yyyy-MM-dd -> dd/MM
    if (day?.length >= 10) return `${day.slice(8, 10)}/${day.slice(5, 7)}`;
    return day;
  }
}
