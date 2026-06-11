import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AdminApi,
  CategoryResponse,
  OptionDto,
  ProductRequest,
  ProductResponse,
  VariantRequest,
  imageUrl,
} from '@zentro/shared';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { errMessage } from '../core/ui';

interface VariantRow {
  id: number | null;
  name: string;
  sku: string | null;
  costPrice: number | null;
  salePrice: number | null;
  stockQty: number | null;
  minStockAlert: number | null;
  active: boolean;
  options: OptionDto[];
  optAttr: string;
  optValue: string;
}

@Component({
  selector: 'app-produtos',
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
    SelectModule,
    DatePickerModule,
    TextareaModule,
  ],
  template: `
    <div class="page">
      <div class="page-head">
        <h1 class="page-title">Produtos</h1>
        <span class="grow"></span>
        <input
          pInputText
          type="text"
          placeholder="Buscar produto..."
          [(ngModel)]="q"
          (keyup.enter)="reload()"
          style="min-width: 220px"
        />
        <p-select
          [options]="categories()"
          optionLabel="name"
          optionValue="id"
          placeholder="Categoria"
          [showClear]="true"
          [(ngModel)]="categoryId"
          (onChange)="reload()"
          style="min-width: 170px"
        />
        <p-select
          [options]="activeOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Status"
          [showClear]="true"
          [(ngModel)]="active"
          (onChange)="reload()"
          style="min-width: 130px"
        />
        <p-button label="Novo produto" icon="pi pi-plus" (onClick)="openNew()" />
      </div>

      <div class="z-card" style="padding: 0.4rem">
        <p-table
          [value]="products()"
          [lazy]="true"
          (onLazyLoad)="load($event)"
          [paginator]="true"
          [rows]="rows"
          [totalRecords]="total()"
          [loading]="loading()"
          dataKey="id"
        >
          <ng-template #header>
            <tr>
              <th style="width: 60px"></th>
              <th>Nome</th>
              <th>Categoria</th>
              <th style="text-align:right">Venda</th>
              <th style="text-align:right">Custo</th>
              <th style="text-align:right">Margem</th>
              <th style="text-align:right">Estoque</th>
              <th>Ativo</th>
              <th style="width: 80px">Destaque</th>
              <th style="width: 110px"></th>
            </tr>
          </ng-template>
          <ng-template #body let-p>
            <tr>
              <td>
                @if (thumb(p); as src) {
                  <img class="thumb-img" [src]="src" [alt]="p.name" />
                } @else {
                  <span class="thumb-ph"><i class="pi pi-image"></i></span>
                }
              </td>
              <td>
                <strong>{{ p.name }}</strong>
                @if (p.hasVariants) {
                  <div class="muted-sm">{{ p.variants.length }} variações</div>
                }
              </td>
              <td class="z-muted">{{ p.categoryName ?? '—' }}</td>
              <td style="text-align:right">{{ p.salePrice | currency: 'BRL' }}</td>
              <td style="text-align:right" class="z-muted">
                {{ p.costPrice != null ? (p.costPrice | currency: 'BRL') : '—' }}
              </td>
              <td style="text-align:right">
                {{ p.marginPercent != null ? (p.marginPercent | number: '1.0-1') + '%' : '—' }}
              </td>
              <td
                style="text-align:right"
                [class.stock-low]="p.minStockAlert != null && p.totalStock <= p.minStockAlert"
              >
                {{ p.totalStock }}
              </td>
              <td>
                <p-tag
                  [value]="p.active ? 'Ativo' : 'Inativo'"
                  [severity]="p.active ? 'success' : 'danger'"
                />
              </td>
              <td style="text-align:center">
                @if (p.featured) {
                  <i class="pi pi-star-fill" style="color:#f59e0b"></i>
                }
              </td>
              <td>
                <p-button icon="pi pi-pencil" [text]="true" size="small" (onClick)="openEdit(p)" />
                <p-button
                  icon="pi pi-trash"
                  [text]="true"
                  size="small"
                  severity="danger"
                  (onClick)="remove(p)"
                />
              </td>
            </tr>
          </ng-template>
          <ng-template #emptymessage>
            <tr>
              <td colspan="10" class="z-muted" style="text-align:center; padding: 1.4rem">
                Nenhum produto encontrado.
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>
    </div>

    <!-- ============================== dialog criar/editar ============================== -->
    <p-dialog
      [header]="editing() ? 'Editar produto' : 'Novo produto'"
      [(visible)]="dialogVisible"
      [modal]="true"
      [style]="{ width: '900px', maxWidth: '97vw' }"
      [maximizable]="true"
    >
      <div class="form-grid">
        <div class="field f-8">
          <label for="pname">Nome *</label>
          <input pInputText id="pname" type="text" [(ngModel)]="form.name" />
        </div>
        <div class="field f-4">
          <label for="pcat">Categoria</label>
          <p-select
            inputId="pcat"
            [options]="categories()"
            optionLabel="name"
            optionValue="id"
            placeholder="Sem categoria"
            [showClear]="true"
            [(ngModel)]="form.categoryId"
            appendTo="body"
          />
        </div>
        <div class="field f-12">
          <label for="pshort">Descrição curta</label>
          <input pInputText id="pshort" type="text" [(ngModel)]="form.shortDescription" />
        </div>
        <div class="field f-12">
          <label for="pdesc">Descrição completa</label>
          <textarea pTextarea id="pdesc" rows="3" [(ngModel)]="form.description"></textarea>
        </div>
        <div class="field f-3">
          <label for="psku">SKU</label>
          <input pInputText id="psku" type="text" [(ngModel)]="form.sku" />
        </div>
        <div class="field f-3">
          <label for="pbar">Código de barras</label>
          <input pInputText id="pbar" type="text" [(ngModel)]="form.barcode" />
        </div>
        <div class="field f-2">
          <label for="punit">Unidade</label>
          <input pInputText id="punit" type="text" [(ngModel)]="form.unit" placeholder="UN" />
        </div>
        <div class="field f-2">
          <label for="pweight">Peso (g)</label>
          <p-inputnumber inputId="pweight" [(ngModel)]="form.weightGrams" [min]="0" />
        </div>
        <div class="field f-2">
          <label for="pmin">Alerta estoque mín.</label>
          <p-inputnumber inputId="pmin" [(ngModel)]="form.minStockAlert" [min]="0" />
        </div>
        <div class="field-inline f-3">
          <p-checkbox inputId="pactive" [(ngModel)]="form.active" [binary]="true" />
          <label for="pactive">Ativo</label>
        </div>
        <div class="field-inline f-3">
          <p-checkbox inputId="pfeat" [(ngModel)]="form.featured" [binary]="true" />
          <label for="pfeat">Destaque</label>
        </div>
      </div>

      <h4 class="section-title">Preços</h4>
      <div class="form-grid">
        <div class="field f-3">
          <label for="pcost">Custo</label>
          <p-inputnumber
            inputId="pcost"
            [(ngModel)]="form.costPrice"
            mode="currency"
            currency="BRL"
            locale="pt-BR"
            [min]="0"
          />
        </div>
        <div class="field f-3">
          <label for="psale">Venda *</label>
          <p-inputnumber
            inputId="psale"
            [(ngModel)]="form.salePrice"
            mode="currency"
            currency="BRL"
            locale="pt-BR"
            [min]="0"
          />
        </div>
        <div class="field f-2">
          <label>Margem</label>
          <span style="padding-top: 0.55rem; font-weight: 600">{{ marginPreview() }}</span>
        </div>
        <div class="field f-2">
          <label for="ppromo">Preço promo</label>
          <p-inputnumber
            inputId="ppromo"
            [(ngModel)]="form.promoPrice"
            mode="currency"
            currency="BRL"
            locale="pt-BR"
            [min]="0"
          />
        </div>
        <div class="field f-2">
          <label for="puntil">Promo válida até</label>
          <p-datepicker
            inputId="puntil"
            [(ngModel)]="promoUntil"
            dateFormat="dd/mm/yy"
            [showIcon]="true"
            appendTo="body"
          />
        </div>
      </div>

      <h4 class="section-title">Variações</h4>
      <p class="muted-sm" style="margin: 0 0 0.6rem">
        Preço de custo/venda em branco herdam os valores do produto. Estoque inicial vale apenas
        para variações novas (depois, use a tela de Estoque).
      </p>
      @if (variants.length > 0) {
        <table class="simple-table" style="margin-bottom: 0.6rem">
          <thead>
            <tr>
              <th style="min-width: 130px">Nome *</th>
              <th>SKU</th>
              <th style="width: 110px">Custo</th>
              <th style="width: 110px">Venda</th>
              <th style="width: 95px">Estoque ini.</th>
              <th style="width: 90px">Alerta mín.</th>
              <th style="width: 60px">Ativa</th>
              <th style="min-width: 210px">Opções (atributo/valor)</th>
              <th style="width: 50px"></th>
            </tr>
          </thead>
          <tbody>
            @for (v of variants; track $index; let i = $index) {
              <tr>
                <td><input pInputText type="text" [(ngModel)]="v.name" style="width:100%" /></td>
                <td><input pInputText type="text" [(ngModel)]="v.sku" style="width:100%" /></td>
                <td>
                  <p-inputnumber [(ngModel)]="v.costPrice" [min]="0" [maxFractionDigits]="2" inputStyleClass="w-full" [style]="{ width: '100%' }" />
                </td>
                <td>
                  <p-inputnumber [(ngModel)]="v.salePrice" [min]="0" [maxFractionDigits]="2" [style]="{ width: '100%' }" />
                </td>
                <td>
                  @if (v.id == null) {
                    <p-inputnumber [(ngModel)]="v.stockQty" [min]="0" [style]="{ width: '100%' }" />
                  } @else {
                    <span class="z-muted">—</span>
                  }
                </td>
                <td>
                  <p-inputnumber [(ngModel)]="v.minStockAlert" [min]="0" [style]="{ width: '100%' }" />
                </td>
                <td style="text-align:center">
                  <p-checkbox [(ngModel)]="v.active" [binary]="true" />
                </td>
                <td>
                  <div class="opts-list">
                    @for (o of v.options; track $index; let j = $index) {
                      <span class="opt-chip">
                        {{ o.attribute }}: {{ o.value }}
                        <i class="pi pi-times" (click)="removeOption(v, j)"></i>
                      </span>
                    }
                    <input
                      pInputText
                      type="text"
                      placeholder="Atributo"
                      [(ngModel)]="v.optAttr"
                      style="width: 84px"
                    />
                    <input
                      pInputText
                      type="text"
                      placeholder="Valor"
                      [(ngModel)]="v.optValue"
                      style="width: 84px"
                    />
                    <p-button
                      icon="pi pi-plus"
                      size="small"
                      [text]="true"
                      [disabled]="!v.optAttr || !v.optValue"
                      (onClick)="addOption(v)"
                    />
                  </div>
                </td>
                <td>
                  <p-button
                    icon="pi pi-trash"
                    [text]="true"
                    size="small"
                    severity="danger"
                    (onClick)="removeVariant(i)"
                  />
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
      <p-button label="Adicionar variação" icon="pi pi-plus" [outlined]="true" size="small" (onClick)="addVariant()" />

      @if (editing(); as prod) {
        <h4 class="section-title">Fotos</h4>
        <div class="photo-grid">
          @for (img of prod.images; track img.id) {
            <div class="photo-cell">
              <img [src]="thumbUrl(img.id)" alt="foto do produto" />
              @if (img.cover) {
                <span class="cover-badge">CAPA</span>
              }
              <div class="photo-actions">
                @if (!img.cover) {
                  <p-button
                    icon="pi pi-star"
                    size="small"
                    [text]="true"
                    title="Definir como capa"
                    (onClick)="setCover(prod, img.id)"
                  />
                }
                <p-button
                  icon="pi pi-trash"
                  size="small"
                  [text]="true"
                  severity="danger"
                  title="Excluir foto"
                  (onClick)="deleteImage(prod, img.id)"
                />
              </div>
            </div>
          }
        </div>
        <div style="margin-top: 0.7rem">
          <input
            #fileInput
            type="file"
            accept="image/*"
            multiple
            style="display:none"
            (change)="upload(prod, fileInput)"
          />
          <p-button
            label="Adicionar fotos"
            icon="pi pi-upload"
            [outlined]="true"
            size="small"
            [loading]="uploading()"
            (onClick)="fileInput.click()"
          />
        </div>
      } @else {
        <p class="muted-sm" style="margin-top: 1rem">
          <i class="pi pi-info-circle"></i> Salve o produto para poder enviar fotos.
        </p>
      }

      <div class="dialog-footer">
        <p-button label="Cancelar" severity="secondary" [text]="true" (onClick)="dialogVisible = false" />
        <p-button
          label="Salvar"
          icon="pi pi-check"
          [loading]="saving()"
          [disabled]="!form.name || form.salePrice == null"
          (onClick)="save()"
        />
      </div>
    </p-dialog>
  `,
})
export class ProdutosPage implements OnInit {
  private api = inject(AdminApi);
  private toast = inject(MessageService);
  private confirm = inject(ConfirmationService);

  readonly rows = 10;
  readonly activeOptions = [
    { label: 'Ativos', value: true },
    { label: 'Inativos', value: false },
  ];

  readonly products = signal<ProductResponse[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly categories = signal<CategoryResponse[]>([]);
  readonly saving = signal(false);
  readonly uploading = signal(false);
  readonly editing = signal<ProductResponse | null>(null);

  q = '';
  categoryId: number | null = null;
  active: boolean | null = null;
  dialogVisible = false;
  promoUntil: Date | null = null;
  form: ProductRequest = this.blank();
  variants: VariantRow[] = [];
  private page = 0;

  ngOnInit(): void {
    this.api.categories().subscribe((c) => this.categories.set(c.filter((x) => x.active)));
    this.fetch();
  }

  private blank(): ProductRequest {
    return {
      name: '',
      categoryId: null,
      shortDescription: null,
      description: null,
      sku: null,
      barcode: null,
      unit: 'UN',
      costPrice: null,
      salePrice: null as unknown as number,
      promoPrice: null,
      promoUntil: null,
      weightGrams: null,
      active: true,
      featured: false,
      minStockAlert: null,
      variants: [],
    };
  }

  thumb(p: ProductResponse): string | null {
    const cover = p.images.find((i) => i.cover) ?? p.images[0];
    return cover ? imageUrl(cover.id, 'thumb') : null;
  }

  thumbUrl(id: number): string {
    return imageUrl(id, 'thumb')!;
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
    this.api
      .products({
        q: this.q || undefined,
        categoryId: this.categoryId ?? undefined,
        active: this.active ?? undefined,
        page: this.page,
        size: this.rows,
      })
      .subscribe({
        next: (p) => {
          this.products.set(p.content);
          this.total.set(p.totalElements);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.toast.add({ severity: 'error', summary: 'Erro', detail: errMessage(err) });
        },
      });
  }

  marginPreview(): string {
    const c = this.form.costPrice;
    const v = this.form.salePrice;
    if (c == null || v == null || c <= 0) return '—';
    return (((v - c) / c) * 100).toFixed(1) + '%';
  }

  openNew(): void {
    this.editing.set(null);
    this.form = this.blank();
    this.variants = [];
    this.promoUntil = null;
    this.dialogVisible = true;
  }

  openEdit(p: ProductResponse): void {
    this.editing.set(p);
    this.form = {
      name: p.name,
      categoryId: p.categoryId,
      shortDescription: p.shortDescription,
      description: p.description,
      sku: p.sku,
      barcode: p.barcode,
      unit: p.unit,
      costPrice: p.costPrice,
      salePrice: p.salePrice,
      promoPrice: p.promoPrice,
      promoUntil: p.promoUntil,
      weightGrams: p.weightGrams,
      active: p.active,
      featured: p.featured,
      minStockAlert: p.minStockAlert,
      variants: [],
    };
    this.promoUntil = p.promoUntil ? new Date(p.promoUntil) : null;
    this.variants = p.variants.map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      costPrice: v.costPrice,
      salePrice: v.salePrice,
      stockQty: null,
      minStockAlert: v.minStockAlert,
      active: v.active,
      options: [...v.options],
      optAttr: '',
      optValue: '',
    }));
    this.dialogVisible = true;
  }

  addVariant(): void {
    this.variants.push({
      id: null,
      name: '',
      sku: null,
      costPrice: null,
      salePrice: null,
      stockQty: 0,
      minStockAlert: null,
      active: true,
      options: [],
      optAttr: '',
      optValue: '',
    });
  }

  removeVariant(i: number): void {
    this.variants.splice(i, 1);
  }

  addOption(v: VariantRow): void {
    if (!v.optAttr || !v.optValue) return;
    v.options.push({ attribute: v.optAttr, value: v.optValue });
    v.optAttr = '';
    v.optValue = '';
  }

  removeOption(v: VariantRow, j: number): void {
    v.options.splice(j, 1);
  }

  save(): void {
    const request: ProductRequest = {
      ...this.form,
      promoUntil: this.promoUntil ? this.promoUntil.toISOString() : null,
      variants: this.variants
        .filter((v) => v.name)
        .map<VariantRequest>((v) => ({
          id: v.id,
          name: v.name,
          sku: v.sku || null,
          costPrice: v.costPrice,
          salePrice: v.salePrice,
          stockQty: v.id == null ? (v.stockQty ?? 0) : null,
          minStockAlert: v.minStockAlert,
          active: v.active,
          options: v.options,
        })),
    };

    const isNew = !this.editing();
    this.saving.set(true);
    this.api.saveProduct(this.editing()?.id ?? null, request).subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.fetch();
        if (isNew) {
          // mantem o dialog aberto em modo edicao para enviar as fotos do produto recem-criado
          this.openEdit(saved);
          this.toast.add({
            severity: 'success',
            summary: 'Produto criado',
            detail: 'Agora adicione as fotos do produto na seção abaixo.',
            life: 6000,
          });
        } else {
          this.dialogVisible = false;
          this.toast.add({ severity: 'success', summary: 'Produto salvo' });
        }
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.add({ severity: 'error', summary: 'Erro ao salvar', detail: errMessage(err) });
      },
    });
  }

  remove(p: ProductResponse): void {
    this.confirm.confirm({
      header: 'Excluir produto',
      message: `Excluir o produto "${p.name}"?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Excluir', severity: 'danger' },
      rejectButtonProps: { label: 'Cancelar', severity: 'secondary', outlined: true },
      accept: () =>
        this.api.deleteProduct(p.id).subscribe({
          next: () => {
            this.toast.add({ severity: 'success', summary: 'Produto excluído' });
            this.fetch();
          },
          error: (err) =>
            this.toast.add({
              severity: 'error',
              summary: 'Não foi possível excluir',
              detail: errMessage(err),
            }),
        }),
    });
  }

  // ------------------------------------------------ fotos

  upload(prod: ProductResponse, input: HTMLInputElement): void {
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (files.length === 0) return;
    this.uploading.set(true);
    this.uploadNext(prod, files, 0);
  }

  private uploadNext(prod: ProductResponse, files: File[], index: number): void {
    if (index >= files.length) {
      this.uploading.set(false);
      this.toast.add({ severity: 'success', summary: `${files.length} foto(s) enviada(s)` });
      this.refreshEditing(prod.id);
      return;
    }
    this.api.uploadImage(prod.id, files[index]).subscribe({
      next: () => this.uploadNext(prod, files, index + 1),
      error: (err) => {
        this.uploading.set(false);
        this.toast.add({ severity: 'error', summary: 'Erro no upload', detail: errMessage(err) });
        this.refreshEditing(prod.id);
      },
    });
  }

  setCover(prod: ProductResponse, imageId: number): void {
    this.api.setCover(imageId).subscribe({
      next: () => this.refreshEditing(prod.id),
      error: (err) =>
        this.toast.add({ severity: 'error', summary: 'Erro', detail: errMessage(err) }),
    });
  }

  deleteImage(prod: ProductResponse, imageId: number): void {
    this.api.deleteImage(imageId).subscribe({
      next: () => this.refreshEditing(prod.id),
      error: (err) =>
        this.toast.add({ severity: 'error', summary: 'Erro', detail: errMessage(err) }),
    });
  }

  private refreshEditing(id: number): void {
    this.api.product(id).subscribe((p) => {
      this.editing.set(p);
      this.fetch();
    });
  }
}
