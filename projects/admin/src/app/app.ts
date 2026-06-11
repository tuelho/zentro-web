import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastModule, ConfirmDialogModule],
  template: `
    <router-outlet />
    <p-toast position="top-right" />
    <p-confirmdialog [style]="{ width: '26rem' }" />
  `,
})
export class App {
  constructor() {
    // aplica o tema persistido antes de qualquer pagina renderizar
    if (localStorage.getItem('zentro_theme') === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }
}
