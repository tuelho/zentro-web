import { Routes } from '@angular/router';
import { authGuard, lojistaGuard, platformGuard } from './core/guards';
import { Shell } from './layout/shell';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login').then((m) => m.LoginPage) },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        canActivate: [lojistaGuard],
        loadComponent: () => import('./pages/dashboard').then((m) => m.DashboardPage),
      },
      {
        path: 'pedidos',
        canActivate: [lojistaGuard],
        loadComponent: () => import('./pages/pedidos').then((m) => m.PedidosPage),
      },
      {
        path: 'entregas',
        canActivate: [lojistaGuard],
        loadComponent: () => import('./pages/entregas').then((m) => m.EntregasPage),
      },
      {
        path: 'produtos',
        canActivate: [lojistaGuard],
        loadComponent: () => import('./pages/produtos').then((m) => m.ProdutosPage),
      },
      {
        path: 'categorias',
        canActivate: [lojistaGuard],
        loadComponent: () => import('./pages/categorias').then((m) => m.CategoriasPage),
      },
      {
        path: 'estoque',
        canActivate: [lojistaGuard],
        loadComponent: () => import('./pages/estoque').then((m) => m.EstoquePage),
      },
      {
        path: 'clientes',
        canActivate: [lojistaGuard],
        loadComponent: () => import('./pages/clientes').then((m) => m.ClientesPage),
      },
      {
        path: 'relatorios',
        canActivate: [lojistaGuard],
        loadComponent: () => import('./pages/relatorios').then((m) => m.RelatoriosPage),
      },
      {
        path: 'configuracoes',
        canActivate: [lojistaGuard],
        loadComponent: () => import('./pages/configuracoes').then((m) => m.ConfiguracoesPage),
      },
      {
        path: 'plataforma',
        canActivate: [platformGuard],
        loadComponent: () => import('./pages/plataforma').then((m) => m.PlataformaPage),
      },
      {
        path: 'administradores',
        canActivate: [platformGuard],
        loadComponent: () => import('./pages/administradores').then((m) => m.AdministradoresPage),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
