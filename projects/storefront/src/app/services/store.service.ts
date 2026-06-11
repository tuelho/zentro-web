import { Injectable, inject, signal } from '@angular/core';
import { StoreApi, StoreInfo } from '@zentro/shared';

/** Carrega as configuracoes publicas da loja (resolvida pelo Host) e aplica o tema. */
@Injectable({ providedIn: 'root' })
export class StoreService {
  private api = inject(StoreApi);

  readonly store = signal<StoreInfo | null>(null);
  readonly notFound = signal(false);
  readonly loaded = signal(false);

  load(): void {
    this.api.settings().subscribe({
      next: (info) => {
        this.store.set(info);
        this.loaded.set(true);
        if (info.themeColor) {
          document.documentElement.style.setProperty('--z-blue', info.themeColor);
        }
        document.title = info.storeName;
      },
      error: () => {
        this.notFound.set(true);
        this.loaded.set(true);
      },
    });
  }
}
