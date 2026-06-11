import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '@zentro/shared';

interface MenuItem {
  label: string;
  icon: string;
  link: string;
}

const LOJISTA_MENU: MenuItem[] = [
  { label: 'Dashboard', icon: 'pi pi-chart-line', link: '/dashboard' },
  { label: 'Pedidos', icon: 'pi pi-clipboard', link: '/pedidos' },
  { label: 'Entregas', icon: 'pi pi-truck', link: '/entregas' },
  { label: 'Produtos', icon: 'pi pi-box', link: '/produtos' },
  { label: 'Categorias', icon: 'pi pi-tags', link: '/categorias' },
  { label: 'Estoque', icon: 'pi pi-database', link: '/estoque' },
  { label: 'Clientes', icon: 'pi pi-users', link: '/clientes' },
  { label: 'Relatórios', icon: 'pi pi-chart-bar', link: '/relatorios' },
  { label: 'Configurações', icon: 'pi pi-cog', link: '/configuracoes' },
];

const PLATFORM_MENU: MenuItem[] = [
  { label: 'Plataforma', icon: 'pi pi-building', link: '/plataforma' },
];

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <aside class="sidebar">
        <div class="sidebar-brand">
          <span class="z-logo-mark">Z</span>
          <span>zentro</span>
        </div>
        <nav class="sidebar-nav">
          @for (item of menu(); track item.link) {
            <a [routerLink]="item.link" routerLinkActive="active">
              <i [class]="item.icon"></i>
              <span>{{ item.label }}</span>
            </a>
          }
        </nav>
      </aside>

      <div class="shell-main">
        <header class="topbar">
          <span class="store-name">{{ storeName() }}</span>
          <span class="spacer"></span>
          <button
            class="icon-btn"
            type="button"
            (click)="toggleTheme()"
            [title]="dark() ? 'Modo claro' : 'Modo escuro'"
          >
            <i [class]="dark() ? 'pi pi-sun' : 'pi pi-moon'"></i>
          </button>
          <span class="user"><i class="pi pi-user"></i> {{ auth.userName() }}</span>
          <button class="icon-btn" type="button" (click)="logout()" title="Sair">
            <i class="pi pi-sign-out"></i>
          </button>
        </header>
        <main>
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class Shell {
  readonly auth = inject(AuthService);
  private router = inject(Router);

  readonly dark = signal(document.documentElement.getAttribute('data-theme') === 'dark');

  readonly isPlatform = computed(() => this.auth.session()?.role === 'PLATFORM_ADMIN');
  readonly menu = computed(() => (this.isPlatform() ? PLATFORM_MENU : LOJISTA_MENU));
  readonly storeName = computed(() =>
    this.isPlatform() ? 'Plataforma Zentro' : (this.auth.session()?.store?.name ?? 'Minha loja'),
  );

  toggleTheme(): void {
    const next = !this.dark();
    this.dark.set(next);
    if (next) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('zentro_theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('zentro_theme', 'light');
    }
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
