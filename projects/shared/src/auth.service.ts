import { Injectable, InjectionToken, computed, inject, signal } from '@angular/core';
import { LoginResponse } from './models';

export interface AuthConfig {
  /** chave do localStorage - diferente por app para nao misturar sessoes */
  storageKey: string;
  /** rota de login para onde redirecionar em 401 */
  loginUrl: string;
}

export const AUTH_CONFIG = new InjectionToken<AuthConfig>('ZENTRO_AUTH_CONFIG');

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly config = inject(AUTH_CONFIG, { optional: true })
    ?? { storageKey: 'zentro_token', loginUrl: '/login' };

  readonly session = signal<LoginResponse | null>(this.restore());
  readonly isLoggedIn = computed(() => this.session() !== null);
  readonly userName = computed(() => this.session()?.name ?? '');

  get loginUrl(): string {
    return this.config.loginUrl;
  }

  token(): string | null {
    return this.session()?.token ?? null;
  }

  store(response: LoginResponse): void {
    localStorage.setItem(this.config.storageKey, JSON.stringify(response));
    this.session.set(response);
  }

  logout(): void {
    localStorage.removeItem(this.config.storageKey);
    this.session.set(null);
  }

  private restore(): LoginResponse | null {
    try {
      const raw = localStorage.getItem(this.config.storageKey);
      return raw ? (JSON.parse(raw) as LoginResponse) : null;
    } catch {
      return null;
    }
  }
}
