import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi, SettingsDto } from '@zentro/shared';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { errMessage } from '../core/ui';

@Component({
  selector: 'app-configuracoes',
  imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, InputNumberModule, TextareaModule],
  template: `
    <div class="page">
      <h1 class="page-title">Configurações da loja</h1>

      @if (form; as f) {
        <div class="z-card">
          <div class="form-grid">
            <div class="field f-6">
              <label for="sname">Nome da loja *</label>
              <input pInputText id="sname" type="text" [(ngModel)]="f.storeName" />
            </div>
            <div class="field f-2">
              <label for="scolor">Cor do tema</label>
              <input
                id="scolor"
                type="color"
                [ngModel]="f.themeColor ?? '#2563EB'"
                (ngModelChange)="f.themeColor = $event"
                style="width: 100%; height: 38px; border: 1px solid var(--z-gray); border-radius: 8px; background: var(--z-surface); padding: 2px; cursor: pointer"
              />
            </div>
            <div class="field f-2">
              <label for="swhats">WhatsApp</label>
              <input pInputText id="swhats" type="text" [(ngModel)]="f.whatsapp" placeholder="(34) 9...." />
            </div>
            <div class="field f-2">
              <label for="sinsta">Instagram</label>
              <input pInputText id="sinsta" type="text" [(ngModel)]="f.instagram" placeholder="@loja" />
            </div>
            <div class="field f-3">
              <label for="sfee">Taxa de entrega (R$)</label>
              <p-inputnumber
                inputId="sfee"
                [(ngModel)]="f.deliveryFeeDefault"
                mode="currency"
                currency="BRL"
                locale="pt-BR"
                [min]="0"
              />
            </div>
            <div class="field f-3">
              <label for="smin">Pedido mínimo (R$)</label>
              <p-inputnumber
                inputId="smin"
                [(ngModel)]="f.minOrderValue"
                mode="currency"
                currency="BRL"
                locale="pt-BR"
                [min]="0"
              />
            </div>
            <div class="field f-6">
              <label for="spix">Chave Pix</label>
              <input pInputText id="spix" type="text" [(ngModel)]="f.pixKey" />
            </div>
            <div class="field f-6">
              <label for="shours">Horário de funcionamento</label>
              <textarea
                pTextarea
                id="shours"
                rows="4"
                [(ngModel)]="f.openingHours"
                placeholder="Seg a Sex: 08h - 18h&#10;Sáb: 08h - 12h"
              ></textarea>
            </div>
            <div class="field f-6">
              <label for="sabout">Sobre a loja</label>
              <textarea pTextarea id="sabout" rows="4" [(ngModel)]="f.aboutText"></textarea>
            </div>
          </div>
          <div class="dialog-footer">
            <p-button
              label="Salvar configurações"
              icon="pi pi-check"
              [loading]="saving()"
              [disabled]="!f.storeName"
              (onClick)="save()"
            />
          </div>
        </div>

        <div class="z-card">
          <h3 class="card-title">Logo da loja</h3>
          <div style="display:flex; align-items:center; gap: 1rem; flex-wrap: wrap">
            @if (logoPreview()) {
              <img class="logo-preview" [src]="logoPreview()" alt="logo" />
            } @else if (f.hasLogo) {
              <span class="z-muted"><i class="pi pi-image"></i> Logo já enviada.</span>
            } @else {
              <span class="z-muted">Nenhuma logo enviada.</span>
            }
            <input
              #logoInput
              type="file"
              accept="image/*"
              style="display:none"
              (change)="onLogoSelected(logoInput)"
            />
            <p-button
              label="Escolher imagem"
              icon="pi pi-image"
              [outlined]="true"
              (onClick)="logoInput.click()"
            />
            @if (logoFile) {
              <p-button
                label="Enviar logo"
                icon="pi pi-upload"
                [loading]="uploadingLogo()"
                (onClick)="uploadLogo()"
              />
            }
          </div>
          <p class="muted-sm" style="margin: 0.6rem 0 0">
            A logo aparece na vitrine da loja (depende do domínio do tenant).
          </p>
        </div>
      } @else {
        <p class="z-muted">Carregando...</p>
      }
    </div>
  `,
})
export class ConfiguracoesPage implements OnInit {
  private api = inject(AdminApi);
  private toast = inject(MessageService);

  readonly saving = signal(false);
  readonly uploadingLogo = signal(false);
  readonly logoPreview = signal<string | null>(null);

  form: SettingsDto | null = null;
  logoFile: File | null = null;

  ngOnInit(): void {
    this.api.settings().subscribe((s) => (this.form = s));
  }

  save(): void {
    if (!this.form) return;
    this.saving.set(true);
    this.api.saveSettings(this.form).subscribe({
      next: (s) => {
        this.saving.set(false);
        this.form = s;
        this.toast.add({ severity: 'success', summary: 'Configurações salvas' });
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.add({ severity: 'error', summary: 'Erro', detail: errMessage(err) });
      },
    });
  }

  onLogoSelected(input: HTMLInputElement): void {
    const file = input.files?.[0] ?? null;
    this.logoFile = file;
    if (!file) {
      this.logoPreview.set(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => this.logoPreview.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  uploadLogo(): void {
    if (!this.logoFile) return;
    this.uploadingLogo.set(true);
    this.api.uploadLogo(this.logoFile).subscribe({
      next: (s) => {
        this.uploadingLogo.set(false);
        this.form = s;
        this.logoFile = null;
        this.toast.add({ severity: 'success', summary: 'Logo enviada com sucesso' });
      },
      error: (err) => {
        this.uploadingLogo.set(false);
        this.toast.add({ severity: 'error', summary: 'Erro no upload', detail: errMessage(err) });
      },
    });
  }
}
