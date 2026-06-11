import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthApi, AuthService, LoginResponse } from '@zentro/shared';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-login',
  imports: [FormsModule, ButtonModule, InputTextModule],
  template: `
    <div class="login-bg">
      <form class="login-card" (ngSubmit)="submit()">
        <div class="login-brand">
          <span class="z-logo-mark">Z</span>
          <span>zentro</span>
        </div>

        <div class="login-tabs">
          <button type="button" [class.active]="tab() === 'lojista'" (click)="tab.set('lojista')">
            Lojista
          </button>
          <button
            type="button"
            [class.active]="tab() === 'plataforma'"
            (click)="tab.set('plataforma')"
          >
            Plataforma
          </button>
        </div>

        <div class="field">
          <label for="email">E-mail</label>
          <input
            pInputText
            id="email"
            type="email"
            name="email"
            [(ngModel)]="email"
            autocomplete="username"
            required
          />
        </div>

        <div class="field">
          <label for="password">Senha</label>
          <input
            pInputText
            id="password"
            type="password"
            name="password"
            [(ngModel)]="password"
            autocomplete="current-password"
            required
          />
        </div>

        @if (error()) {
          <div class="login-error">{{ error() }}</div>
        }

        <p-button
          type="submit"
          label="Entrar"
          styleClass="w-full"
          [style]="{ width: '100%' }"
          [loading]="loading()"
        />
      </form>
    </div>
  `,
})
export class LoginPage {
  private api = inject(AuthApi);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly tab = signal<'lojista' | 'plataforma'>('lojista');
  readonly loading = signal(false);
  readonly error = signal('');

  email = '';
  password = '';

  submit(): void {
    if (!this.email || !this.password || this.loading()) return;
    this.loading.set(true);
    this.error.set('');

    const call =
      this.tab() === 'plataforma'
        ? this.api.platformLogin(this.email, this.password)
        : this.api.adminLogin(this.email, this.password);

    call.subscribe({
      next: (resp: LoginResponse) => {
        this.auth.store(resp);
        this.router.navigateByUrl(resp.role === 'PLATFORM_ADMIN' ? '/plataforma' : '/dashboard');
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Não foi possível entrar. Verifique as credenciais.');
      },
    });
  }
}
