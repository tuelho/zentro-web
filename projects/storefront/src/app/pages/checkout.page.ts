import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  AuthApi,
  AuthService,
  CheckoutRequest,
  GeoService,
  StoreApi,
  ZMap,
} from '@zentro/shared';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TextareaModule } from 'primeng/textarea';

import { CartService } from '../services/cart.service';
import { StoreService } from '../services/store.service';

type DeliveryType = 'ENTREGA' | 'RETIRADA';

@Component({
  selector: 'app-checkout-page',
  imports: [
    CurrencyPipe,
    FormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    RadioButtonModule,
    TextareaModule,
    ZMap,
  ],
  template: `
    <h1>Checkout</h1>

    @if (cart.items().length === 0) {
      <div class="empty z-card">
        <p>Seu carrinho está vazio.</p>
        <a routerLink="/">Voltar para a loja</a>
      </div>
    } @else {
      <ol class="steps">
        @for (label of ['Identificação', 'Entrega', 'Revisão']; track $index) {
          <li
            [class.active]="step() === $index + 1"
            [class.done]="step() > $index + 1"
          >
            <span class="dot">
              @if (step() > $index + 1) {
                <i class="pi pi-check"></i>
              } @else {
                {{ $index + 1 }}
              }
            </span>
            <span class="step-label">{{ label }}</span>
          </li>
        }
      </ol>

      <!-- passo 1: identificacao -->
      @if (step() === 1) {
        <section class="z-card">
          @if (auth.isLoggedIn()) {
            <p class="hello">
              Olá, <strong>{{ auth.userName() }}</strong>!
              <span class="z-muted">({{ auth.session()?.email }})</span>
            </p>
            <p class="z-muted small">O pedido será vinculado à sua conta.</p>
          } @else {
            <div class="tabs">
              <button
                type="button"
                [class.active]="identMode() === 'guest'"
                (click)="identMode.set('guest')"
              >
                Continuar sem conta
              </button>
              <button
                type="button"
                [class.active]="identMode() === 'login'"
                (click)="identMode.set('login')"
              >
                Já tenho conta
              </button>
            </div>

            @if (identMode() === 'guest') {
              <div class="form">
                <label>
                  Nome *
                  <input pInputText [(ngModel)]="guestName" placeholder="Seu nome" />
                </label>
                <label>
                  E-mail *
                  <input
                    pInputText
                    type="email"
                    [(ngModel)]="guestEmail"
                    placeholder="voce@email.com"
                  />
                </label>
                <label>
                  Telefone / WhatsApp
                  <input pInputText [(ngModel)]="guestPhone" placeholder="(34) 99999-9999" />
                </label>
              </div>
            } @else {
              <div class="form">
                <label>
                  E-mail
                  <input pInputText type="email" [(ngModel)]="loginEmail" />
                </label>
                <label>
                  Senha
                  <input pInputText type="password" [(ngModel)]="loginPassword" />
                </label>
                <p-button
                  label="Entrar"
                  icon="pi pi-sign-in"
                  [loading]="loggingIn()"
                  (onClick)="doLogin()"
                />
              </div>
            }
          }

          <div class="nav-row">
            <span></span>
            <p-button label="Continuar" icon="pi pi-arrow-right" iconPos="right" (onClick)="toStep2()" />
          </div>
        </section>
      }

      <!-- passo 2: entrega -->
      @if (step() === 2) {
        <section class="z-card">
          <div class="delivery-options">
            <label class="option" [class.active]="deliveryType === 'ENTREGA'">
              <p-radiobutton name="dt" value="ENTREGA" [(ngModel)]="deliveryType" />
              <span>
                <strong>Entrega</strong>
                <span class="z-muted small block">
                  Taxa: {{ deliveryFee() | currency: 'BRL' }}
                </span>
              </span>
            </label>
            <label class="option" [class.active]="deliveryType === 'RETIRADA'">
              <p-radiobutton name="dt" value="RETIRADA" [(ngModel)]="deliveryType" />
              <span>
                <strong>Retirada</strong>
                <span class="z-muted small block">Retire na loja, sem taxa</span>
              </span>
            </label>
          </div>

          @if (deliveryType === 'ENTREGA') {
            <p class="map-hint">
              <i class="pi pi-map-marker"></i>
              Arraste o pin até sua casa — não precisa de número.
            </p>
            <div class="map-wrap">
              <z-map [lat]="lat()" [lng]="lng()" (positionChange)="onPosition($event)" />
            </div>
            <p-button
              label="Usar minha localização"
              icon="pi pi-compass"
              severity="secondary"
              [outlined]="true"
              size="small"
              (onClick)="useMyLocation()"
            />

            <div class="form address-form">
              <div class="addr-row">
                <label class="cep-field">
                  CEP
                  <span class="cep-input">
                    <input
                      pInputText
                      [(ngModel)]="cep"
                      (ngModelChange)="cepChanged()"
                      (keyup.enter)="onCep()"
                      placeholder="00000-000"
                      inputmode="numeric"
                      maxlength="9"
                    />
                    @if (cepLoading()) {
                      <i class="pi pi-spin pi-spinner"></i>
                    }
                  </span>
                  <span class="z-muted small">Preenche o endereço automaticamente.</span>
                </label>
              </div>
              <div class="addr-row">
                <label class="grow-2">
                  Rua / Logradouro
                  <input pInputText [(ngModel)]="street" placeholder="Ex.: Rua das Flores" />
                </label>
                <label class="num">
                  Número
                  <input pInputText [(ngModel)]="number" placeholder="s/n" />
                </label>
              </div>
              <div class="addr-row">
                <label class="grow-2">
                  Bairro
                  <input pInputText [(ngModel)]="district" placeholder="Ex.: Centro" />
                </label>
                <label class="grow-2">
                  Cidade
                  <input pInputText [(ngModel)]="city" placeholder="Ex.: Uberlândia" />
                </label>
                <label class="uf">
                  UF
                  <input pInputText [(ngModel)]="state" placeholder="MG" maxlength="2" />
                </label>
              </div>
              <label class="highlight">
                Ponto de referência
                <input
                  pInputText
                  [(ngModel)]="reference"
                  placeholder="Ex.: casa azul de portão branco, em frente à padaria"
                />
                <span class="z-muted small">Ajuda muito o entregador a encontrar você!</span>
              </label>
            </div>
          }

          <div class="nav-row">
            <p-button
              label="Voltar"
              icon="pi pi-arrow-left"
              severity="secondary"
              [text]="true"
              (onClick)="step.set(1)"
            />
            <p-button label="Continuar" icon="pi pi-arrow-right" iconPos="right" (onClick)="toStep3()" />
          </div>
        </section>
      }

      <!-- passo 3: revisao -->
      @if (step() === 3) {
        <section class="z-card">
          <h2>Resumo do pedido</h2>
          <div class="review-items">
            @for (item of cart.items(); track item.productId + ':' + item.variantId) {
              <div class="review-item">
                <span>
                  {{ item.qty }}x {{ item.name }}
                  @if (item.variantName) {
                    <span class="z-muted">({{ item.variantName }})</span>
                  }
                </span>
                <span>{{ item.qty * item.unitPrice | currency: 'BRL' }}</span>
              </div>
            }
          </div>

          <div class="totals">
            <div class="row">
              <span>Subtotal</span>
              <span>{{ cart.subtotal() | currency: 'BRL' }}</span>
            </div>
            <div class="row">
              <span>{{ deliveryType === 'ENTREGA' ? 'Taxa de entrega' : 'Retirada na loja' }}</span>
              <span>{{ fee() | currency: 'BRL' }}</span>
            </div>
            <div class="row total">
              <span>Total</span>
              <span class="z-price">{{ total() | currency: 'BRL' }}</span>
            </div>
          </div>

          @if (belowMinimum()) {
            <p class="min-warn">
              <i class="pi pi-exclamation-triangle"></i>
              Pedido mínimo de {{ store()?.minOrderValue | currency: 'BRL' }}. Adicione mais
              itens para continuar.
            </p>
          }

          <div class="form">
            <label>
              Observação
              <textarea
                pTextarea
                rows="2"
                [(ngModel)]="customerNote"
                placeholder="Ex.: sem cebola, troco para R$ 100…"
              ></textarea>
            </label>
            <label>
              Forma de pagamento combinada
              <input pInputText [(ngModel)]="paymentNote" placeholder="ex.: Pix na entrega" />
            </label>
          </div>

          <div class="nav-row">
            <p-button
              label="Voltar"
              icon="pi pi-arrow-left"
              severity="secondary"
              [text]="true"
              (onClick)="step.set(2)"
            />
            <p-button
              label="Confirmar pedido"
              icon="pi pi-check"
              [loading]="submitting()"
              [disabled]="belowMinimum()"
              (onClick)="confirm()"
            />
          </div>
        </section>
      }
    }
  `,
  styles: [
    `
      h1 {
        font-size: 1.3rem;
        margin: 0 0 1rem;
      }
      h2 {
        font-size: 1rem;
        margin: 0 0 0.75rem;
      }
      .empty {
        text-align: center;
        padding: 2.5rem 1rem;
      }
      .steps {
        display: flex;
        gap: 0.5rem;
        list-style: none;
        padding: 0;
        margin: 0 0 1rem;
      }
      .steps li {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 0.45rem;
        color: var(--z-fg-muted);
        font-size: 0.8rem;
      }
      .steps .dot {
        width: 26px;
        height: 26px;
        flex: 0 0 auto;
        border-radius: 50%;
        border: 1px solid var(--z-gray);
        background: var(--z-surface);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 0.75rem;
      }
      .steps li.active {
        color: var(--z-fg);
        font-weight: 600;
      }
      .steps li.active .dot {
        background: var(--z-blue);
        border-color: var(--z-blue);
        color: #fff;
      }
      .steps li.done .dot {
        background: var(--z-green);
        border-color: var(--z-green);
        color: #fff;
      }
      @media (max-width: 540px) {
        .step-label {
          display: none;
        }
        .steps li.active .step-label {
          display: inline;
        }
      }
      section {
        max-width: 640px;
      }
      .hello {
        margin: 0 0 0.25rem;
      }
      .small {
        font-size: 0.78rem;
      }
      .block {
        display: block;
      }
      .tabs {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1rem;
      }
      .tabs button {
        flex: 1;
        border: 1px solid var(--z-gray);
        background: var(--z-surface);
        border-radius: 999px;
        padding: 0.5rem;
        font-family: inherit;
        font-weight: 500;
        cursor: pointer;
      }
      .tabs button.active {
        background: var(--z-blue);
        border-color: var(--z-blue);
        color: #fff;
      }
      .form {
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
        margin-top: 0.75rem;
      }
      .form label {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        font-size: 0.82rem;
        font-weight: 500;
      }
      .form input,
      .form textarea {
        width: 100%;
      }
      .nav-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 1.25rem;
      }
      .delivery-options {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.6rem;
        margin-bottom: 1rem;
      }
      @media (max-width: 480px) {
        .delivery-options {
          grid-template-columns: 1fr;
        }
      }
      .option {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        border: 1px solid var(--z-gray);
        border-radius: var(--z-radius);
        padding: 0.75rem;
        cursor: pointer;
      }
      .option.active {
        border-color: var(--z-blue);
        outline: 2px solid var(--z-blue);
        outline-offset: -2px;
      }
      .map-hint {
        background: color-mix(in srgb, var(--z-blue) 10%, transparent);
        color: var(--z-fg);
        border-radius: var(--z-radius);
        padding: 0.6rem 0.8rem;
        font-size: 0.82rem;
        margin: 0 0 0.6rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .map-hint .pi {
        color: var(--z-blue);
      }
      .map-wrap {
        height: 300px;
        margin-bottom: 0.6rem;
        border-radius: var(--z-radius);
        overflow: hidden;
      }
      .address-form {
        margin-top: 1rem;
      }
      .addr-row {
        display: flex;
        gap: 0.8rem;
      }
      .addr-row > label {
        flex: 1;
      }
      .addr-row .grow-2 {
        flex: 2;
      }
      .addr-row .num {
        flex: 0 0 90px;
      }
      .addr-row .uf {
        flex: 0 0 70px;
      }
      .cep-field {
        max-width: 220px;
      }
      .cep-input {
        position: relative;
        display: flex;
        align-items: center;
      }
      .cep-input input {
        width: 100%;
      }
      .cep-input .pi-spinner {
        position: absolute;
        right: 0.6rem;
        color: var(--z-blue);
      }
      @media (max-width: 480px) {
        .addr-row {
          flex-wrap: wrap;
        }
      }
      .highlight {
        background: color-mix(in srgb, var(--z-green) 12%, transparent);
        border: 1px dashed var(--z-green);
        border-radius: var(--z-radius);
        padding: 0.6rem;
      }
      .review-items {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        margin-bottom: 0.9rem;
      }
      .review-item {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        font-size: 0.86rem;
      }
      .totals {
        border-top: 1px solid var(--z-gray);
        padding-top: 0.6rem;
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
      }
      .totals .row {
        display: flex;
        justify-content: space-between;
        font-size: 0.86rem;
      }
      .totals .total {
        font-weight: 700;
        font-size: 1rem;
        margin-top: 0.25rem;
      }
      .min-warn {
        color: var(--z-danger);
        font-size: 0.82rem;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 0.4rem;
        margin: 0.75rem 0 0;
      }
    `,
  ],
})
export class CheckoutPage {
  protected readonly cart = inject(CartService);
  protected readonly auth = inject(AuthService);
  private readonly storeSvc = inject(StoreService);
  private readonly storeApi = inject(StoreApi);
  private readonly authApi = inject(AuthApi);
  private readonly geo = inject(GeoService);
  private readonly messages = inject(MessageService);
  private readonly router = inject(Router);

  private readonly map = viewChild(ZMap);

  protected readonly store = this.storeSvc.store;
  protected readonly step = signal(1);
  protected readonly identMode = signal<'guest' | 'login'>('guest');
  protected readonly loggingIn = signal(false);
  protected readonly submitting = signal(false);

  // identificacao (convidado)
  protected guestName = '';
  protected guestEmail = '';
  protected guestPhone = '';

  // login
  protected loginEmail = '';
  protected loginPassword = '';

  // entrega
  protected deliveryType: DeliveryType = 'ENTREGA';
  protected readonly lat = signal(-18.91);
  protected readonly lng = signal(-48.26);
  protected cep = '';
  protected street = '';
  protected number = '';
  protected district = '';
  protected city = '';
  protected state = '';
  protected reference = '';
  protected readonly cepLoading = signal(false);

  // revisao
  protected customerNote = '';
  protected paymentNote = '';

  protected readonly deliveryFee = computed(() => this.store()?.deliveryFee ?? 0);
  protected readonly fee = computed(() =>
    this.deliveryType === 'ENTREGA' ? this.deliveryFee() : 0,
  );
  protected readonly total = computed(() => this.cart.subtotal() + this.fee());
  protected readonly belowMinimum = computed(() => {
    const min = this.store()?.minOrderValue ?? 0;
    return min > 0 && this.cart.subtotal() < min;
  });

  protected doLogin(): void {
    if (!this.loginEmail.trim() || !this.loginPassword) {
      this.messages.add({ severity: 'warn', summary: 'Informe e-mail e senha' });
      return;
    }
    this.loggingIn.set(true);
    this.authApi.customerLogin(this.loginEmail.trim(), this.loginPassword).subscribe({
      next: (resp) => {
        this.auth.store(resp);
        this.loggingIn.set(false);
        this.messages.add({ severity: 'success', summary: `Bem-vindo(a), ${resp.name}!` });
        this.step.set(2);
      },
      error: (err) => {
        this.loggingIn.set(false);
        this.messages.add({
          severity: 'error',
          summary: 'Não foi possível entrar',
          detail: err?.error?.message ?? 'Confira seu e-mail e senha.',
        });
      },
    });
  }

  protected toStep2(): void {
    if (!this.auth.isLoggedIn()) {
      if (this.identMode() === 'login') {
        this.messages.add({
          severity: 'warn',
          summary: 'Faça login ou continue sem conta',
        });
        return;
      }
      if (!this.guestName.trim() || !this.guestEmail.trim()) {
        this.messages.add({
          severity: 'warn',
          summary: 'Dados incompletos',
          detail: 'Informe pelo menos nome e e-mail.',
        });
        return;
      }
    }
    this.step.set(2);
  }

  protected toStep3(): void {
    this.step.set(3);
  }

  protected onPosition(pos: { lat: number; lng: number }): void {
    this.lat.set(pos.lat);
    this.lng.set(pos.lng);
    // geocodificacao reversa: preenche os campos a partir do pin
    this.geo.reverseGeocode(pos.lat, pos.lng).subscribe((r) => {
      if (!r) return;
      if (r.street) this.street = r.street;
      if (r.district) this.district = r.district;
      if (r.city) this.city = r.city;
      if (r.state) this.state = this.uf(r.state);
      if (r.zip && !this.cep.trim()) this.cep = r.zip;
    });
  }

  private lastCep = '';

  /** Dispara a busca automaticamente quando o CEP fica completo (8 digitos). */
  protected cepChanged(): void {
    const digits = this.cep.replace(/\D/g, '');
    if (digits.length === 8 && digits !== this.lastCep) {
      this.onCep();
    } else if (digits.length < 8) {
      this.lastCep = '';
    }
  }

  /** Busca o endereco pelo CEP (ViaCEP), preenche os campos e posiciona o pin no mapa. */
  protected onCep(): void {
    const digits = this.cep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    this.lastCep = digits;
    this.cep = digits.replace(/(\d{5})(\d{3})/, '$1-$2');
    this.cepLoading.set(true);
    this.geo.lookupCep(digits).subscribe((r) => {
      if (!r) {
        this.cepLoading.set(false);
        this.messages.add({ severity: 'warn', summary: 'CEP não encontrado' });
        return;
      }
      if (r.street) this.street = r.street;
      if (r.district) this.district = r.district;
      if (r.city) this.city = r.city;
      if (r.state) this.state = this.uf(r.state);
      // posiciona o pin no mapa a partir do endereco do CEP
      this.geo
        .geocodeAddress({ street: r.street, city: r.city, state: r.state, zip: digits })
        .subscribe((pos) => {
          this.cepLoading.set(false);
          if (pos) {
            this.lat.set(pos.lat);
            this.lng.set(pos.lng);
          }
        });
    });
  }

  /** Normaliza o estado para a sigla de 2 letras (Nominatim devolve o nome completo). */
  private uf(state: string): string {
    if (state.length === 2) return state.toUpperCase();
    const map: Record<string, string> = {
      acre: 'AC', alagoas: 'AL', amapa: 'AP', amazonas: 'AM', bahia: 'BA',
      ceara: 'CE', 'distrito federal': 'DF', 'espirito santo': 'ES', goias: 'GO',
      maranhao: 'MA', 'mato grosso': 'MT', 'mato grosso do sul': 'MS',
      'minas gerais': 'MG', para: 'PA', paraiba: 'PB', parana: 'PR',
      pernambuco: 'PE', piaui: 'PI', 'rio de janeiro': 'RJ',
      'rio grande do norte': 'RN', 'rio grande do sul': 'RS', rondonia: 'RO',
      roraima: 'RR', 'santa catarina': 'SC', 'sao paulo': 'SP', sergipe: 'SE',
      tocantins: 'TO',
    };
    const key = state
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
    return map[key] ?? state;
  }

  protected useMyLocation(): void {
    this.map()?.useMyLocation();
  }

  protected confirm(): void {
    if (this.belowMinimum()) {
      this.messages.add({
        severity: 'warn',
        summary: 'Pedido mínimo não atingido',
        detail: `O pedido mínimo desta loja é ${this.store()?.minOrderValue ?? 0}.`,
      });
      return;
    }

    const request: CheckoutRequest = {
      customer: this.auth.isLoggedIn()
        ? null
        : {
            name: this.guestName.trim(),
            email: this.guestEmail.trim(),
            phone: this.guestPhone.trim() || undefined,
          },
      deliveryType: this.deliveryType,
      address:
        this.deliveryType === 'ENTREGA'
          ? {
              label: 'Entrega',
              street: this.street.trim() || undefined,
              number: this.number.trim() || undefined,
              district: this.district.trim() || undefined,
              city: this.city.trim() || undefined,
              state: this.state.trim() || undefined,
              zip: this.cep.replace(/\D/g, '') || undefined,
              reference: this.reference.trim() || undefined,
              latitude: this.lat(),
              longitude: this.lng(),
            }
          : null,
      items: this.cart.items().map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        qty: i.qty,
      })),
      customerNote: this.customerNote.trim() || undefined,
      paymentNote: this.paymentNote.trim() || undefined,
    };

    this.submitting.set(true);
    this.storeApi.checkout(request).subscribe({
      next: (resp) => {
        this.submitting.set(false);
        this.cart.clear();
        this.router.navigate(['/pedido', resp.code], { queryParams: { sucesso: 1 } });
      },
      error: (err) => {
        this.submitting.set(false);
        this.messages.add({
          severity: 'error',
          summary: 'Não foi possível fechar o pedido',
          detail: err?.error?.message ?? 'Tente novamente em instantes.',
        });
      },
    });
  }
}
