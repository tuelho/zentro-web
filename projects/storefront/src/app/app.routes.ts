import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home.page').then((m) => m.HomePage),
  },
  {
    path: 'produto/:slug',
    loadComponent: () => import('./pages/product.page').then((m) => m.ProductPage),
  },
  {
    path: 'carrinho',
    loadComponent: () => import('./pages/cart.page').then((m) => m.CartPage),
  },
  {
    path: 'checkout',
    loadComponent: () => import('./pages/checkout.page').then((m) => m.CheckoutPage),
  },
  {
    path: 'pedido/:code',
    loadComponent: () => import('./pages/order.page').then((m) => m.OrderPage),
  },
  {
    path: 'conta',
    loadComponent: () => import('./pages/account.page').then((m) => m.AccountPage),
  },
  { path: '**', redirectTo: '' },
];
