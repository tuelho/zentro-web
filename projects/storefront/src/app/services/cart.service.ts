import { Injectable, computed, signal } from '@angular/core';

export interface CartItem {
  productId: number;
  variantId: number | null;
  name: string;
  variantName: string | null;
  unitPrice: number;
  qty: number;
  imageId: number | null;
}

const STORAGE_KEY = 'zentro_cart';

@Injectable({ providedIn: 'root' })
export class CartService {
  readonly items = signal<CartItem[]>(this.restore());

  readonly count = computed(() => this.items().reduce((sum, i) => sum + i.qty, 0));
  readonly subtotal = computed(() =>
    this.items().reduce((sum, i) => sum + i.qty * i.unitPrice, 0),
  );

  add(item: CartItem): void {
    const items = [...this.items()];
    const found = items.find(
      (i) => i.productId === item.productId && i.variantId === item.variantId,
    );
    if (found) {
      found.qty += item.qty;
    } else {
      items.push({ ...item });
    }
    this.update(items);
  }

  setQty(item: CartItem, qty: number): void {
    if (qty <= 0) {
      this.remove(item);
      return;
    }
    this.update(
      this.items().map((i) =>
        i.productId === item.productId && i.variantId === item.variantId
          ? { ...i, qty }
          : i,
      ),
    );
  }

  remove(item: CartItem): void {
    this.update(
      this.items().filter(
        (i) => !(i.productId === item.productId && i.variantId === item.variantId),
      ),
    );
  }

  clear(): void {
    this.update([]);
  }

  private update(items: CartItem[]): void {
    this.items.set(items);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  private restore(): CartItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  }
}
