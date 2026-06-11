import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  AuthApi,
  AuthService,
  CustomerApi,
  ORDER_STATUS_LABELS,
  OrderResponse,
} from '@zentro/shared';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-account-page',
  imports: [CurrencyPipe, DatePipe, FormsModule, RouterLink, ButtonModule, InputTextModule],
  template: `
    @if (auth.isLoggedIn()) {
      <div class="head">
        <div>
          <h1>Olá, {{ auth.userName() }}!</h1>
          <p class="z-muted">{{ auth.session()?.email }}</p>
        </div>
        <p-button
          label="Sair"
          icon="pi pi-sign-out"
          severity="secondary"
          [outlined]="true"
          size="small"
          (onClick)="logout()"
        />
      </div>

      <h2>Meus pedidos</h2>
      @if (loadingOrders()) {
        <p class="z-muted">Carregando…</p>
      } @else if (orders().length === 0) {
        <div class="empty z-card">
          <i class="pi pi-box"></i>
          <p>Você ainda não fez nenhum pedido.</p>
          <a routerLink="/">Ver produtos</a>
        </div>
      } @else {
        <div class="orders">
          @for (o of orders(); track o.id) {
            <a class="order z-card" [routerLink]="['/pedido', o.code]">
              <div class="order-info">
                <strong>{{ o.code }}</strong>
                <span class="z-muted small">
                  {{ o.createdAt | date: 'dd/MM/yyyy HH:mm' }} ·
                  {{ o.items.length }} item(ns)
                </span>
              </div>
              <div class="order-side">
                <span class="z-price">{{ o.total | currency: 'BRL' }}</span>
                <span class="status" [class.cancelled]="o.status === 'CANCELADO'">
                  {{ label(o.status) }}
                </span>
              </div>
              <i class="pi pi-angle-right"></i>
            </a>
          }
        </div>
      }
    } @else {
      <section class="auth z-card">
        <div class="tabs">
          <button type="button" [class.active]="tab() === 'login'" (click)="tab.set('login')">
            Entrar
          </button>
          <button
            type="button"
            [class.active]="tab() === 'register'"
            (click)="tab.set('register')"
          >
            Criar conta
          </button>
        </div>

        @if (tab() === 'login') {
          <div class="form">
            <label>
              E-mail
              <input pInputText type="email" [(ngModel)]="loginEmail" />
            </label>
            <label>
              Senha
              <input pInputText type="password" [(ngModel)]="loginPassword" (keyup.enter)="doLogin()" />
            </label>
            <p-button
              label="Entrar"
              icon="pi pi-sign-in"
              [loading]="busy()"
              (onClick)="doLogin()"
            />
          </div>
        } @else {
          <div class="form">
            <label>
              Nome *
              <input pInputText [(ngModel)]="regName" />
            </label>
            <label>
              E-mail *
              <input pInputText type="email" [(ngModel)]="regEmail" />
            </label>
            <label>
              Telefone / WhatsApp
              <input pInputText [(ngModel)]="regPhone" placeholder="(34) 99999-9999" />
            </label>
            <label>
              Senha *
              <input pInputText type="password" [(ngModel)]="regPassword" />
            </label>
            <p-button
              label="Criar conta"
              icon="pi pi-user-plus"
              [loading]="busy()"
              (onClick)="doRegister()"
            />
          </div>
        }
      </section>
    }
  `,
  styles: [
    `
      .head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
        margin-bottom: 1.25rem;
      }
      h1 {
        font-size: 1.3rem;
        margin: 0;
      }
      .head p {
        margin: 0.2rem 0 0;
        font-size: 0.85rem;
      }
      h2 {
        font-size: 1rem;
        margin: 0 0 0.75rem;
      }
      .empty {
        text-align: center;
        padding: 2.5rem 1rem;
      }
      .empty .pi {
        font-size: 2rem;
        color: var(--z-fg-muted);
      }
      .orders {
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
      }
      .order {
        display: flex;
        align-items: center;
        gap: 0.8rem;
        color: var(--z-fg);
        padding: 0.8rem 1rem;
        transition: box-shadow 0.15s ease;
      }
      .order:hover {
        box-shadow: 0 4px 14px rgba(13, 27, 42, 0.1);
      }
      .order-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
        min-width: 0;
      }
      .small {
        font-size: 0.76rem;
      }
      .order-side {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.25rem;
      }
      .status {
        background: var(--z-blue);
        color: #fff;
        font-size: 0.68rem;
        font-weight: 600;
        padding: 0.18rem 0.6rem;
        border-radius: 999px;
      }
      .status.cancelled {
        background: var(--z-danger);
      }
      .order > .pi {
        color: var(--z-fg-muted);
      }
      .auth {
        max-width: 440px;
        margin: 0 auto;
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
      }
      .form label {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        font-size: 0.82rem;
        font-weight: 500;
      }
      .form input {
        width: 100%;
      }
    `,
  ],
})
export class AccountPage implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly authApi = inject(AuthApi);
  private readonly customerApi = inject(CustomerApi);
  private readonly messages = inject(MessageService);

  protected readonly tab = signal<'login' | 'register'>('login');
  protected readonly busy = signal(false);
  protected readonly orders = signal<OrderResponse[]>([]);
  protected readonly loadingOrders = signal(false);

  protected loginEmail = '';
  protected loginPassword = '';
  protected regName = '';
  protected regEmail = '';
  protected regPhone = '';
  protected regPassword = '';

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      this.loadOrders();
    }
  }

  protected label(status: string): string {
    return ORDER_STATUS_LABELS[status] ?? status;
  }

  protected doLogin(): void {
    if (!this.loginEmail.trim() || !this.loginPassword) {
      this.messages.add({ severity: 'warn', summary: 'Informe e-mail e senha' });
      return;
    }
    this.busy.set(true);
    this.authApi.customerLogin(this.loginEmail.trim(), this.loginPassword).subscribe({
      next: (resp) => {
        this.auth.store(resp);
        this.busy.set(false);
        this.messages.add({ severity: 'success', summary: `Bem-vindo(a), ${resp.name}!` });
        this.loadOrders();
      },
      error: (err) => {
        this.busy.set(false);
        this.messages.add({
          severity: 'error',
          summary: 'Não foi possível entrar',
          detail: err?.error?.message ?? 'Confira seu e-mail e senha.',
        });
      },
    });
  }

  protected doRegister(): void {
    if (!this.regName.trim() || !this.regEmail.trim() || !this.regPassword) {
      this.messages.add({
        severity: 'warn',
        summary: 'Dados incompletos',
        detail: 'Informe nome, e-mail e senha.',
      });
      return;
    }
    this.busy.set(true);
    this.authApi
      .customerRegister({
        name: this.regName.trim(),
        email: this.regEmail.trim(),
        phone: this.regPhone.trim() || undefined,
        password: this.regPassword,
      })
      .subscribe({
        next: (resp) => {
          this.auth.store(resp);
          this.busy.set(false);
          this.messages.add({ severity: 'success', summary: `Conta criada, ${resp.name}!` });
          this.loadOrders();
        },
        error: (err) => {
          this.busy.set(false);
          this.messages.add({
            severity: 'error',
            summary: 'Não foi possível criar a conta',
            detail: err?.error?.message ?? 'Tente novamente.',
          });
        },
      });
  }

  protected logout(): void {
    this.auth.logout();
    this.orders.set([]);
  }

  private loadOrders(): void {
    this.loadingOrders.set(true);
    this.customerApi.myOrders().subscribe({
      next: (page) => {
        this.orders.set(page.content);
        this.loadingOrders.set(false);
      },
      error: () => this.loadingOrders.set(false),
    });
  }
}
