import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlatformApi, TenantOverview, TenantRow } from '@zentro/shared';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { errMessage } from '../core/ui';

@Component({
  selector: 'app-plataforma',
  imports: [CommonModule, FormsModule, TableModule, TagModule, ButtonModule, DialogModule, InputTextModule],
  template: `
    <div class="page">
      <div class="page-head">
        <h1 class="page-title">Plataforma — lojas</h1>
        <span class="grow"></span>
        <p-button label="Nova loja" icon="pi pi-plus" (onClick)="openNew()" />
      </div>

      <div class="tenant-cards">
        @for (t of overview(); track t.id) {
          <div class="z-card tenant-card">
            <div style="display:flex; align-items:center; gap: 0.5rem">
              <span class="t-name">{{ t.name }}</span>
              <span class="grow" style="flex:1"></span>
              <p-tag
                [value]="t.status === 'ATIVO' ? 'Ativa' : 'Suspensa'"
                [severity]="t.status === 'ATIVO' ? 'success' : 'danger'"
              />
            </div>
            <div class="muted-sm">{{ t.slug }}.localhost</div>
            <div class="t-stats">
              <span>Pedidos hoje: <strong>{{ t.ordersToday }}</strong></span>
              <span>Vendas: <strong>{{ t.salesToday | currency: 'BRL' }}</strong></span>
            </div>
          </div>
        }
      </div>

      <div class="z-card" style="padding: 0.4rem">
        <p-table [value]="tenants()" dataKey="id">
          <ng-template #header>
            <tr>
              <th>Nome</th>
              <th>Slug</th>
              <th>Domínios</th>
              <th>Status</th>
              <th>Criada em</th>
              <th style="width: 150px"></th>
            </tr>
          </ng-template>
          <ng-template #body let-t>
            <tr>
              <td><strong>{{ t.name }}</strong></td>
              <td>{{ t.slug }}</td>
              <td class="z-muted">{{ t.domains.join(', ') || '—' }}</td>
              <td>
                <p-tag
                  [value]="t.status === 'ATIVO' ? 'Ativa' : 'Suspensa'"
                  [severity]="t.status === 'ATIVO' ? 'success' : 'danger'"
                />
              </td>
              <td>{{ t.createdAt | date: 'dd/MM/yyyy' }}</td>
              <td>
                @if (t.status === 'ATIVO') {
                  <p-button
                    label="Suspender"
                    icon="pi pi-ban"
                    size="small"
                    severity="danger"
                    [outlined]="true"
                    (onClick)="toggleStatus(t)"
                  />
                } @else {
                  <p-button
                    label="Ativar"
                    icon="pi pi-check"
                    size="small"
                    severity="success"
                    [outlined]="true"
                    (onClick)="toggleStatus(t)"
                  />
                }
              </td>
            </tr>
          </ng-template>
          <ng-template #emptymessage>
            <tr>
              <td colspan="6" class="z-muted" style="text-align:center; padding: 1.4rem">
                Nenhuma loja cadastrada.
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>
    </div>

    <p-dialog
      header="Nova loja"
      [(visible)]="dialogVisible"
      [modal]="true"
      [style]="{ width: '520px', maxWidth: '95vw' }"
    >
      <div class="form-grid">
        <div class="field f-7" style="grid-column: span 7">
          <label for="tname">Nome da loja *</label>
          <input pInputText id="tname" type="text" [(ngModel)]="form.name" />
        </div>
        <div class="field f-5" style="grid-column: span 5">
          <label for="tslug">Slug *</label>
          <input pInputText id="tslug" type="text" [(ngModel)]="form.slug" placeholder="minha-loja" />
        </div>
        <div class="field f-12">
          <label for="taname">Nome do admin *</label>
          <input pInputText id="taname" type="text" [(ngModel)]="form.adminName" />
        </div>
        <div class="field f-6">
          <label for="taemail">E-mail do admin *</label>
          <input pInputText id="taemail" type="email" [(ngModel)]="form.adminEmail" />
        </div>
        <div class="field f-6">
          <label for="tapass">Senha do admin *</label>
          <input pInputText id="tapass" type="password" [(ngModel)]="form.adminPassword" />
        </div>
        <div class="field f-8">
          <label for="tdomain">Domínio extra (opcional)</label>
          <input pInputText id="tdomain" type="text" [(ngModel)]="extraDomain" placeholder="loja.com.br" />
        </div>
        <div class="field f-4">
          <label for="tcolor">Cor do tema</label>
          <input
            id="tcolor"
            type="color"
            [(ngModel)]="form.themeColor"
            style="width: 100%; height: 38px; border: 1px solid var(--z-gray); border-radius: 8px; background: var(--z-surface); padding: 2px; cursor: pointer"
          />
        </div>
      </div>
      <div class="dialog-footer">
        <p-button label="Cancelar" severity="secondary" [text]="true" (onClick)="dialogVisible = false" />
        <p-button
          label="Criar loja"
          icon="pi pi-check"
          [loading]="saving()"
          [disabled]="!canCreate()"
          (onClick)="create()"
        />
      </div>
    </p-dialog>
  `,
})
export class PlataformaPage implements OnInit {
  private api = inject(PlatformApi);
  private toast = inject(MessageService);
  private confirm = inject(ConfirmationService);

  readonly tenants = signal<TenantRow[]>([]);
  readonly overview = signal<TenantOverview[]>([]);
  readonly saving = signal(false);

  dialogVisible = false;
  extraDomain = '';
  form = this.blank();

  ngOnInit(): void {
    this.reload();
  }

  private blank() {
    return {
      name: '',
      slug: '',
      adminName: '',
      adminEmail: '',
      adminPassword: '',
      themeColor: '#2563EB',
    };
  }

  reload(): void {
    this.api.tenants().subscribe((list) => this.tenants.set(list));
    this.api.overview().subscribe((list) => this.overview.set(list));
  }

  openNew(): void {
    this.form = this.blank();
    this.extraDomain = '';
    this.dialogVisible = true;
  }

  canCreate(): boolean {
    const f = this.form;
    return !!(f.name && f.slug && f.adminName && f.adminEmail && f.adminPassword);
  }

  create(): void {
    this.saving.set(true);
    this.api
      .createTenant({
        ...this.form,
        domains: this.extraDomain ? [this.extraDomain] : undefined,
      })
      .subscribe({
        next: (t) => {
          this.saving.set(false);
          this.dialogVisible = false;
          this.toast.add({
            severity: 'success',
            summary: 'Loja criada',
            detail: `Acesse ${t.slug}.localhost para abrir a vitrine da loja.`,
            life: 8000,
          });
          this.reload();
        },
        error: (err) => {
          this.saving.set(false);
          this.toast.add({ severity: 'error', summary: 'Erro', detail: errMessage(err) });
        },
      });
  }

  toggleStatus(t: TenantRow): void {
    const next = t.status === 'ATIVO' ? 'SUSPENSO' : 'ATIVO';
    this.confirm.confirm({
      header: next === 'SUSPENSO' ? 'Suspender loja' : 'Ativar loja',
      message:
        next === 'SUSPENSO'
          ? `Suspender a loja "${t.name}"? A vitrine e o painel ficarão indisponíveis.`
          : `Reativar a loja "${t.name}"?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: {
        label: next === 'SUSPENSO' ? 'Suspender' : 'Ativar',
        severity: next === 'SUSPENSO' ? 'danger' : 'success',
      },
      rejectButtonProps: { label: 'Cancelar', severity: 'secondary', outlined: true },
      accept: () =>
        this.api.changeStatus(t.id, next).subscribe({
          next: () => {
            this.toast.add({ severity: 'success', summary: 'Status atualizado' });
            this.reload();
          },
          error: (err) =>
            this.toast.add({ severity: 'error', summary: 'Erro', detail: errMessage(err) }),
        }),
    });
  }
}
