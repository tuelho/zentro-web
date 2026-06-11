import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi, CategoryResponse } from '@zentro/shared';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { errMessage } from '../core/ui';

@Component({
  selector: 'app-categorias',
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    TagModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    CheckboxModule,
  ],
  template: `
    <div class="page">
      <div class="page-head">
        <h1 class="page-title">Categorias</h1>
        <span class="grow"></span>
        <p-button label="Nova categoria" icon="pi pi-plus" (onClick)="openNew()" />
      </div>

      <div class="z-card" style="padding: 0.4rem">
        <p-table [value]="categories()" dataKey="id">
          <ng-template #header>
            <tr>
              <th>Nome</th>
              <th>Descrição</th>
              <th style="width: 90px">Ordem</th>
              <th style="width: 90px">Ativa</th>
              <th style="width: 110px"></th>
            </tr>
          </ng-template>
          <ng-template #body let-c>
            <tr>
              <td><strong>{{ c.name }}</strong></td>
              <td class="z-muted">{{ c.description ?? '—' }}</td>
              <td>{{ c.displayOrder }}</td>
              <td>
                <p-tag
                  [value]="c.active ? 'Ativa' : 'Inativa'"
                  [severity]="c.active ? 'success' : 'danger'"
                />
              </td>
              <td>
                <p-button icon="pi pi-pencil" [text]="true" size="small" (onClick)="openEdit(c)" />
                <p-button
                  icon="pi pi-trash"
                  [text]="true"
                  size="small"
                  severity="danger"
                  (onClick)="remove(c)"
                />
              </td>
            </tr>
          </ng-template>
          <ng-template #emptymessage>
            <tr>
              <td colspan="5" class="z-muted" style="text-align:center; padding: 1.4rem">
                Nenhuma categoria cadastrada.
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>
    </div>

    <p-dialog
      [header]="form.id ? 'Editar categoria' : 'Nova categoria'"
      [(visible)]="dialogVisible"
      [modal]="true"
      [style]="{ width: '440px', maxWidth: '95vw' }"
    >
      <div class="form-grid">
        <div class="field f-12">
          <label for="cname">Nome *</label>
          <input pInputText id="cname" type="text" [(ngModel)]="form.name" />
        </div>
        <div class="field f-12">
          <label for="cdesc">Descrição</label>
          <input pInputText id="cdesc" type="text" [(ngModel)]="form.description" />
        </div>
        <div class="field f-6">
          <label for="corder">Ordem de exibição</label>
          <p-inputnumber inputId="corder" [(ngModel)]="form.displayOrder" [min]="0" />
        </div>
        <div class="field-inline f-6">
          <p-checkbox inputId="cactive" [(ngModel)]="form.active" [binary]="true" />
          <label for="cactive">Ativa</label>
        </div>
      </div>
      <div class="dialog-footer">
        <p-button label="Cancelar" severity="secondary" [text]="true" (onClick)="dialogVisible = false" />
        <p-button label="Salvar" [loading]="saving()" [disabled]="!form.name" (onClick)="save()" />
      </div>
    </p-dialog>
  `,
})
export class CategoriasPage implements OnInit {
  private api = inject(AdminApi);
  private toast = inject(MessageService);
  private confirm = inject(ConfirmationService);

  readonly categories = signal<CategoryResponse[]>([]);
  readonly saving = signal(false);

  dialogVisible = false;
  form: Partial<CategoryResponse> = this.blank();

  ngOnInit(): void {
    this.reload();
  }

  private blank(): Partial<CategoryResponse> {
    return { name: '', description: null, displayOrder: 0, active: true };
  }

  reload(): void {
    this.api.categories().subscribe((list) => this.categories.set(list));
  }

  openNew(): void {
    this.form = this.blank();
    this.dialogVisible = true;
  }

  openEdit(c: CategoryResponse): void {
    this.form = { ...c };
    this.dialogVisible = true;
  }

  save(): void {
    this.saving.set(true);
    this.api.saveCategory(this.form).subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible = false;
        this.toast.add({ severity: 'success', summary: 'Categoria salva' });
        this.reload();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.add({ severity: 'error', summary: 'Erro', detail: errMessage(err) });
      },
    });
  }

  remove(c: CategoryResponse): void {
    this.confirm.confirm({
      header: 'Excluir categoria',
      message: `Excluir a categoria "${c.name}"?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Excluir', severity: 'danger' },
      rejectButtonProps: { label: 'Cancelar', severity: 'secondary', outlined: true },
      accept: () =>
        this.api.deleteCategory(c.id).subscribe({
          next: () => {
            this.toast.add({ severity: 'success', summary: 'Categoria excluída' });
            this.reload();
          },
          error: (err) =>
            this.toast.add({ severity: 'error', summary: 'Erro', detail: errMessage(err) }),
        }),
    });
  }
}
