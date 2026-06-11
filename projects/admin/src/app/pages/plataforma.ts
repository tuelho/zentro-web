import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlatformApi, TenantDetail, TenantOverview, TenantRow } from '@zentro/shared';
import { Observable, forkJoin } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { errMessage } from '../core/ui';

@Component({
  selector: 'app-plataforma',
  imports: [
    CommonModule, FormsModule, TableModule, TagModule, ButtonModule, DialogModule,
    InputTextModule, CheckboxModule,
  ],
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
            <div class="muted-sm">{{ primaryDomain(t.id) || t.slug }}</div>
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
              <th style="width: 230px"></th>
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
              <td style="display:flex; gap:0.4rem">
                <p-button
                  label="Editar"
                  icon="pi pi-pencil"
                  size="small"
                  [outlined]="true"
                  (onClick)="openEdit(t)"
                />
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

    <!-- ====================== Nova loja ====================== -->
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
          <input pInputText id="tslug" type="text" [(ngModel)]="form.slug" placeholder="minhaloja" />
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

    <!-- ====================== Editar loja ====================== -->
    <p-dialog
      header="Editar loja"
      [(visible)]="editVisible"
      [modal]="true"
      [style]="{ width: '660px', maxWidth: '95vw' }"
    >
      @if (editing(); as t) {
        <!-- Dados da loja -->
        <h3 class="edit-section">Dados da loja</h3>
        <div class="form-grid">
          <div class="field f-8" style="grid-column: span 8">
            <label for="ename">Nome da loja *</label>
            <input pInputText id="ename" type="text" [(ngModel)]="editForm.name" />
          </div>
          <div class="field f-4" style="grid-column: span 4">
            <label for="ecolor">Cor do tema</label>
            <input
              id="ecolor"
              type="color"
              [(ngModel)]="editForm.themeColor"
              style="width: 100%; height: 38px; border: 1px solid var(--z-gray); border-radius: 8px; background: var(--z-surface); padding: 2px; cursor: pointer"
            />
          </div>
        </div>
        <!-- Domínios -->
        <h3 class="edit-section">Domínios</h3>
        <div class="dom-list">
          @for (d of t.domains; track d.id) {
            <div class="dom-row">
              <span class="dom-name">{{ d.domain }}</span>
              @if (d.primary) {
                <p-tag value="principal" severity="info" />
              } @else {
                <p-button
                  label="Tornar principal"
                  size="small"
                  [text]="true"
                  (onClick)="setPrimary(t.id, d.id)"
                />
              }
              <span class="grow" style="flex:1"></span>
              @if (t.domains.length > 1) {
                <p-button
                  icon="pi pi-trash"
                  size="small"
                  severity="danger"
                  [text]="true"
                  (onClick)="removeDomain(t.id, d.id)"
                />
              }
            </div>
          }
        </div>
        <div class="add-domain">
          <input
            pInputText
            type="text"
            [(ngModel)]="newDomain"
            placeholder="loja.controlemaximo.com.br"
            style="flex:1"
          />
          <p-button
            label="Adicionar"
            icon="pi pi-plus"
            size="small"
            [disabled]="!newDomain"
            (onClick)="addDomain(t.id)"
          />
        </div>

        <!-- Lojistas -->
        <h3 class="edit-section">Usuários lojistas</h3>
        @for (u of editUsers; track u.id) {
          <div class="form-grid user-row">
            <div class="field f-4" style="grid-column: span 4">
              <label>Nome</label>
              <input pInputText type="text" [(ngModel)]="u.name" />
            </div>
            <div class="field f-6" style="grid-column: span 6">
              <label>E-mail (login)</label>
              <input pInputText type="email" [(ngModel)]="u.email" />
            </div>
            <div class="field-inline f-2" style="grid-column: span 2">
              <p-checkbox [binary]="true" [(ngModel)]="u.active" [inputId]="'uactive' + u.id" />
              <label [for]="'uactive' + u.id">Ativo</label>
            </div>
          </div>
        }

        <div class="dialog-footer" style="display:flex; align-items:center; gap:0.5rem; margin-top:1.2rem">
          <p-button label="Fechar" severity="secondary" [text]="true" (onClick)="editVisible = false" />
          <span style="flex:1"></span>
          @if (editUsers.length) {
            <p-button
              label="Redefinir senha"
              icon="pi pi-key"
              severity="secondary"
              [outlined]="true"
              (onClick)="openPassword(t.id, editUsers[0].id, editUsers[0].name)"
            />
          }
          <p-button
            label="Salvar"
            icon="pi pi-check"
            [loading]="savingTenant()"
            [disabled]="!editForm.name"
            (onClick)="saveAll(t.id)"
          />
        </div>
      }
    </p-dialog>

    <!-- ====================== Redefinir senha ====================== -->
    <p-dialog
      header="Redefinir senha"
      [(visible)]="passwordVisible"
      [modal]="true"
      [style]="{ width: '420px', maxWidth: '95vw' }"
    >
      <p class="z-muted" style="margin-top:0">
        Nova senha para <strong>{{ pwUserName }}</strong>.
      </p>
      <div class="field f-12">
        <label for="newpass">Nova senha *</label>
        <input pInputText id="newpass" type="password" [(ngModel)]="newPassword" />
      </div>
      <div class="dialog-footer">
        <p-button label="Cancelar" severity="secondary" [text]="true" (onClick)="passwordVisible = false" />
        <p-button
          label="Salvar senha"
          icon="pi pi-check"
          [loading]="savingPassword()"
          [disabled]="newPassword.length < 6"
          (onClick)="savePassword()"
        />
      </div>
    </p-dialog>
  `,
  styles: [
    `
      .edit-section {
        font-size: 0.95rem;
        margin: 1rem 0 0.5rem;
        padding-bottom: 0.3rem;
        border-bottom: 1px solid var(--z-gray);
      }
      .dom-list {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
      }
      .dom-row {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        padding: 0.4rem 0.2rem;
      }
      .dom-name {
        font-family: monospace;
      }
      .add-domain {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.6rem;
      }
      .user-row {
        padding: 0.5rem 0;
      }
      .user-row + .user-row {
        border-top: 1px dashed var(--z-gray);
      }
    `,
  ],
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

  // edicao
  readonly editing = signal<TenantDetail | null>(null);
  editVisible = false;
  editForm = { name: '', themeColor: '#2563EB' };
  editUsers: { id: number; name: string; email: string; active: boolean }[] = [];
  newDomain = '';
  readonly savingTenant = signal(false);

  // redefinir senha
  passwordVisible = false;
  pwTenantId = 0;
  pwUserId = 0;
  pwUserName = '';
  newPassword = '';
  readonly savingPassword = signal(false);

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

  primaryDomain(id: number): string {
    return this.tenants().find((t) => t.id === id)?.domains?.[0] ?? '';
  }

  // ---------- nova loja ----------

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
      .createTenant({ ...this.form, domains: this.extraDomain ? [this.extraDomain] : undefined })
      .subscribe({
        next: (t) => {
          this.saving.set(false);
          this.dialogVisible = false;
          this.toast.add({
            severity: 'success',
            summary: 'Loja criada',
            detail: `Loja "${t.name}" criada. Edite-a para ajustar domínios se precisar.`,
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

  // ---------- editar loja ----------

  openEdit(t: TenantRow): void {
    this.newDomain = '';
    this.editUsers = [];
    this.editVisible = true;
    this.editing.set(null);
    this.api.getTenant(t.id).subscribe({
      next: (d) => this.loadDetail(d),
      error: (err) =>
        this.toast.add({ severity: 'error', summary: 'Erro', detail: errMessage(err) }),
    });
  }

  private loadDetail(d: TenantDetail): void {
    this.editForm = { name: d.name, themeColor: d.themeColor ?? '#2563EB' };
    this.editUsers = d.users.map((u) => ({ id: u.id, name: u.name, email: u.email, active: u.active }));
    this.editing.set(d);
  }

  /** Atualiza a lista de dominios (apos add/remover/principal) sem perder o que o usuario digitou nos campos. */
  private applyDetail(d: TenantDetail): void {
    this.editing.set(d);
    this.reload();
  }

  /** Salva tudo de uma vez: dados da loja + lojistas. */
  saveAll(id: number): void {
    this.savingTenant.set(true);
    const calls: Observable<unknown>[] = [
      this.api.updateTenant(id, { name: this.editForm.name, themeColor: this.editForm.themeColor }),
      ...this.editUsers.map((u) =>
        this.api.updateTenantUser(id, u.id, { name: u.name, email: u.email, active: u.active })),
    ];
    forkJoin(calls).subscribe({
      next: () => {
        this.savingTenant.set(false);
        this.toast.add({ severity: 'success', summary: 'Alterações salvas' });
        this.reload();
        this.api.getTenant(id).subscribe((d) => this.loadDetail(d));
      },
      error: (err) => {
        this.savingTenant.set(false);
        this.toast.add({ severity: 'error', summary: 'Erro', detail: errMessage(err) });
      },
    });
  }

  addDomain(id: number): void {
    const domain = this.newDomain.trim();
    if (!domain) return;
    this.api.addDomain(id, domain).subscribe({
      next: (d) => {
        this.newDomain = '';
        this.applyDetail(d);
        this.toast.add({ severity: 'success', summary: 'Domínio adicionado' });
      },
      error: (err) =>
        this.toast.add({ severity: 'error', summary: 'Erro', detail: errMessage(err) }),
    });
  }

  setPrimary(id: number, domainId: number): void {
    this.api.setPrimaryDomain(id, domainId).subscribe({
      next: (d) => {
        this.applyDetail(d);
        this.toast.add({ severity: 'success', summary: 'Domínio principal atualizado' });
      },
      error: (err) =>
        this.toast.add({ severity: 'error', summary: 'Erro', detail: errMessage(err) }),
    });
  }

  removeDomain(id: number, domainId: number): void {
    this.confirm.confirm({
      header: 'Remover domínio',
      message: 'Remover este domínio da loja? A vitrine deixará de responder por ele.',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Remover', severity: 'danger' },
      rejectButtonProps: { label: 'Cancelar', severity: 'secondary', outlined: true },
      accept: () =>
        this.api.removeDomain(id, domainId).subscribe({
          next: (d) => {
            this.applyDetail(d);
            this.toast.add({ severity: 'success', summary: 'Domínio removido' });
          },
          error: (err) =>
            this.toast.add({ severity: 'error', summary: 'Erro', detail: errMessage(err) }),
        }),
    });
  }

  openPassword(tenantId: number, userId: number, userName: string): void {
    this.pwTenantId = tenantId;
    this.pwUserId = userId;
    this.pwUserName = userName;
    this.newPassword = '';
    this.passwordVisible = true;
  }

  savePassword(): void {
    if (this.newPassword.length < 6) return;
    this.savingPassword.set(true);
    this.api.resetTenantUserPassword(this.pwTenantId, this.pwUserId, this.newPassword).subscribe({
      next: () => {
        this.savingPassword.set(false);
        this.passwordVisible = false;
        this.toast.add({ severity: 'success', summary: 'Senha redefinida' });
      },
      error: (err) => {
        this.savingPassword.set(false);
        this.toast.add({ severity: 'error', summary: 'Erro', detail: errMessage(err) });
      },
    });
  }

  // ---------- status ----------

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
