import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService, PlatformAdminRow, PlatformApi } from '@zentro/shared';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { errMessage } from '../core/ui';

@Component({
  selector: 'app-administradores',
  imports: [
    CommonModule, FormsModule, TableModule, TagModule, ButtonModule, DialogModule, InputTextModule,
  ],
  template: `
    <div class="page">
      <div class="page-head">
        <h1 class="page-title">Administradores da plataforma</h1>
        <span class="grow"></span>
        <p-button label="Novo admin" icon="pi pi-plus" (onClick)="openNew()" />
      </div>

      <div class="z-card" style="padding: 0.4rem">
        <p-table [value]="admins()" dataKey="id">
          <ng-template #header>
            <tr>
              <th>Nome</th>
              <th>E-mail (login)</th>
              <th style="width: 320px"></th>
            </tr>
          </ng-template>
          <ng-template #body let-a>
            <tr>
              <td>
                <strong>{{ a.name }}</strong>
                @if (a.id === currentId()) {
                  <p-tag value="você" severity="info" styleClass="ml-2" />
                }
              </td>
              <td class="z-muted">{{ a.email }}</td>
              <td style="display:flex; gap:0.4rem">
                <p-button
                  label="Editar"
                  icon="pi pi-pencil"
                  size="small"
                  [outlined]="true"
                  (onClick)="openEdit(a)"
                />
                <p-button
                  label="Senha"
                  icon="pi pi-key"
                  size="small"
                  severity="secondary"
                  [outlined]="true"
                  (onClick)="openPassword(a)"
                />
                <p-button
                  label="Excluir"
                  icon="pi pi-trash"
                  size="small"
                  severity="danger"
                  [outlined]="true"
                  [disabled]="a.id === currentId()"
                  (onClick)="remove(a)"
                />
              </td>
            </tr>
          </ng-template>
          <ng-template #emptymessage>
            <tr>
              <td colspan="3" class="z-muted" style="text-align:center; padding: 1.4rem">
                Nenhum administrador cadastrado.
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>
    </div>

    <!-- criar / editar -->
    <p-dialog
      [header]="editingId() ? 'Editar administrador' : 'Novo administrador'"
      [(visible)]="formVisible"
      [modal]="true"
      [style]="{ width: '460px', maxWidth: '95vw' }"
    >
      <div class="form-grid">
        <div class="field f-12">
          <label for="aname">Nome *</label>
          <input pInputText id="aname" type="text" [(ngModel)]="form.name" />
        </div>
        <div class="field f-12">
          <label for="aemail">E-mail (login) *</label>
          <input pInputText id="aemail" type="email" [(ngModel)]="form.email" />
        </div>
        @if (!editingId()) {
          <div class="field f-12">
            <label for="apass">Senha *</label>
            <input pInputText id="apass" type="password" [(ngModel)]="form.password" />
            <small class="z-muted">Mínimo de 6 caracteres.</small>
          </div>
        }
      </div>
      <div class="dialog-footer">
        <p-button label="Cancelar" severity="secondary" [text]="true" (onClick)="formVisible = false" />
        <p-button
          label="Salvar"
          icon="pi pi-check"
          [loading]="saving()"
          [disabled]="!canSave()"
          (onClick)="save()"
        />
      </div>
    </p-dialog>

    <!-- trocar senha -->
    <p-dialog
      header="Alterar senha"
      [(visible)]="passwordVisible"
      [modal]="true"
      [style]="{ width: '420px', maxWidth: '95vw' }"
    >
      <p class="z-muted" style="margin-top:0">
        Nova senha para <strong>{{ pwName }}</strong>.
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
})
export class AdministradoresPage implements OnInit {
  private api = inject(PlatformApi);
  private auth = inject(AuthService);
  private toast = inject(MessageService);
  private confirm = inject(ConfirmationService);

  readonly admins = signal<PlatformAdminRow[]>([]);
  readonly saving = signal(false);
  readonly savingPassword = signal(false);
  readonly currentId = computed(() => this.auth.session()?.id ?? 0);

  formVisible = false;
  readonly editingId = signal<number | null>(null);
  form = { name: '', email: '', password: '' };

  passwordVisible = false;
  pwId = 0;
  pwName = '';
  newPassword = '';

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.api.admins().subscribe((list) => this.admins.set(list));
  }

  canSave(): boolean {
    const f = this.form;
    if (this.editingId()) return !!(f.name && f.email);
    return !!(f.name && f.email && f.password.length >= 6);
  }

  openNew(): void {
    this.editingId.set(null);
    this.form = { name: '', email: '', password: '' };
    this.formVisible = true;
  }

  openEdit(a: PlatformAdminRow): void {
    this.editingId.set(a.id);
    this.form = { name: a.name, email: a.email, password: '' };
    this.formVisible = true;
  }

  save(): void {
    if (!this.canSave()) return;
    this.saving.set(true);
    const id = this.editingId();
    const done = {
      next: () => {
        this.saving.set(false);
        this.formVisible = false;
        this.toast.add({ severity: 'success', summary: id ? 'Administrador atualizado' : 'Administrador criado' });
        this.reload();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.toast.add({ severity: 'error', summary: 'Erro', detail: errMessage(err) });
      },
    };
    if (id) {
      this.api.updateAdmin(id, { name: this.form.name, email: this.form.email }).subscribe(done);
    } else {
      this.api.createAdmin({ name: this.form.name, email: this.form.email, password: this.form.password }).subscribe(done);
    }
  }

  openPassword(a: PlatformAdminRow): void {
    this.pwId = a.id;
    this.pwName = a.name;
    this.newPassword = '';
    this.passwordVisible = true;
  }

  savePassword(): void {
    if (this.newPassword.length < 6) return;
    this.savingPassword.set(true);
    this.api.changeAdminPassword(this.pwId, this.newPassword).subscribe({
      next: () => {
        this.savingPassword.set(false);
        this.passwordVisible = false;
        this.toast.add({ severity: 'success', summary: 'Senha alterada' });
      },
      error: (err) => {
        this.savingPassword.set(false);
        this.toast.add({ severity: 'error', summary: 'Erro', detail: errMessage(err) });
      },
    });
  }

  remove(a: PlatformAdminRow): void {
    this.confirm.confirm({
      header: 'Excluir administrador',
      message: `Excluir o administrador "${a.name}"? Ele perderá o acesso à plataforma.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Excluir', severity: 'danger' },
      rejectButtonProps: { label: 'Cancelar', severity: 'secondary', outlined: true },
      accept: () =>
        this.api.deleteAdmin(a.id).subscribe({
          next: () => {
            this.toast.add({ severity: 'success', summary: 'Administrador excluído' });
            this.reload();
          },
          error: (err) =>
            this.toast.add({ severity: 'error', summary: 'Erro', detail: errMessage(err) }),
        }),
    });
  }
}
