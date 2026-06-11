import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AddressDto, CategoryCard, CategoryResponse, CheckoutRequest, CheckoutResponse,
  CustomerDetail, CustomerRow, Dashboard, DeliveryView, ImageMetaDto, LoginResponse,
  LowStockItem, MovementResponse, MovementType, OrderResponse, OrderStatus, Page,
  ProductCard, ProductDetail, ProductRequest, ProductResponse, SalesRow, SettingsDto,
  PlatformAdminRow, StoreInfo, TenantDetail, TenantOverview, TenantRow, TenantUserRow,
} from './models';

function params(obj: Record<string, unknown>): HttpParams {
  let p = new HttpParams();
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined && value !== '') {
      p = p.set(key, String(value));
    }
  }
  return p;
}

export function imageUrl(id: number | null, size: 'thumb' | 'full' = 'thumb'): string | null {
  return id != null ? `/api/store/images/${id}?size=${size}` : null;
}

// ---------------------------------------------------------------- publica

@Injectable({ providedIn: 'root' })
export class StoreApi {
  private http = inject(HttpClient);

  settings(): Observable<StoreInfo> {
    return this.http.get<StoreInfo>('/api/store/settings');
  }

  categories(): Observable<CategoryCard[]> {
    return this.http.get<CategoryCard[]>('/api/store/categories');
  }

  products(filter: { q?: string; categoryId?: number; featured?: boolean; page?: number; size?: number }):
      Observable<Page<ProductCard>> {
    return this.http.get<Page<ProductCard>>('/api/store/products', { params: params(filter) });
  }

  product(slug: string): Observable<ProductDetail> {
    return this.http.get<ProductDetail>(`/api/store/products/${slug}`);
  }

  checkout(request: CheckoutRequest): Observable<CheckoutResponse> {
    return this.http.post<CheckoutResponse>('/api/store/checkout', request);
  }

  track(code: string): Observable<OrderResponse> {
    return this.http.get<OrderResponse>(`/api/store/orders/${code}`);
  }
}

// ---------------------------------------------------------------- auth

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private http = inject(HttpClient);

  adminLogin(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/api/auth/admin/login', { email, password });
  }

  platformLogin(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/api/auth/platform/login', { email, password });
  }

  customerLogin(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/api/auth/customer/login', { email, password });
  }

  customerRegister(data: { name: string; email: string; phone?: string; password: string }):
      Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/api/auth/customer/register', data);
  }
}

// ---------------------------------------------------------------- cliente logado

@Injectable({ providedIn: 'root' })
export class CustomerApi {
  private http = inject(HttpClient);

  myOrders(page = 0): Observable<Page<OrderResponse>> {
    return this.http.get<Page<OrderResponse>>('/api/customer/orders', { params: params({ page }) });
  }

  addresses(): Observable<AddressDto[]> {
    return this.http.get<AddressDto[]>('/api/customer/addresses');
  }
}

// ---------------------------------------------------------------- admin (lojista)

@Injectable({ providedIn: 'root' })
export class AdminApi {
  private http = inject(HttpClient);

  // categorias
  categories(): Observable<CategoryResponse[]> {
    return this.http.get<CategoryResponse[]>('/api/admin/categories');
  }
  saveCategory(data: Partial<CategoryResponse>): Observable<CategoryResponse> {
    return data.id
      ? this.http.put<CategoryResponse>(`/api/admin/categories/${data.id}`, data)
      : this.http.post<CategoryResponse>('/api/admin/categories', data);
  }
  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`/api/admin/categories/${id}`);
  }

  // produtos
  products(filter: { q?: string; categoryId?: number; active?: boolean; page?: number; size?: number }):
      Observable<Page<ProductResponse>> {
    return this.http.get<Page<ProductResponse>>('/api/admin/products', { params: params(filter) });
  }
  product(id: number): Observable<ProductResponse> {
    return this.http.get<ProductResponse>(`/api/admin/products/${id}`);
  }
  saveProduct(id: number | null, data: ProductRequest): Observable<ProductResponse> {
    return id
      ? this.http.put<ProductResponse>(`/api/admin/products/${id}`, data)
      : this.http.post<ProductResponse>('/api/admin/products', data);
  }
  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`/api/admin/products/${id}`);
  }
  uploadImage(productId: number, file: File, cover = false): Observable<ImageMetaDto> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ImageMetaDto>(
      `/api/admin/products/${productId}/images?cover=${cover}`, form);
  }
  deleteImage(imageId: number): Observable<void> {
    return this.http.delete<void>(`/api/admin/products/images/${imageId}`);
  }
  setCover(imageId: number): Observable<void> {
    return this.http.put<void>(`/api/admin/products/images/${imageId}/cover`, {});
  }

  // estoque
  movements(productId: number | null, page = 0): Observable<Page<MovementResponse>> {
    return this.http.get<Page<MovementResponse>>('/api/admin/stock/movements',
      { params: params({ productId, page }) });
  }
  move(data: { productId: number; variantId?: number | null; type: MovementType; qty: number; reason?: string }):
      Observable<MovementResponse> {
    return this.http.post<MovementResponse>('/api/admin/stock/movements', data);
  }
  lowStock(): Observable<LowStockItem[]> {
    return this.http.get<LowStockItem[]>('/api/admin/stock/low');
  }

  // pedidos
  orders(filter: { status?: string; q?: string; page?: number; size?: number }):
      Observable<Page<OrderResponse>> {
    return this.http.get<Page<OrderResponse>>('/api/admin/orders', { params: params(filter) });
  }
  orderCounts(): Observable<Record<string, number>> {
    return this.http.get<Record<string, number>>('/api/admin/orders/counts');
  }
  order(id: number): Observable<OrderResponse> {
    return this.http.get<OrderResponse>(`/api/admin/orders/${id}`);
  }
  changeStatus(id: number, status: OrderStatus, note?: string): Observable<OrderResponse> {
    return this.http.patch<OrderResponse>(`/api/admin/orders/${id}/status`, { status, note });
  }

  // entregas
  deliveries(): Observable<DeliveryView[]> {
    return this.http.get<DeliveryView[]>('/api/admin/deliveries');
  }
  updateDelivery(orderId: number, data: { courierName?: string; scheduledFor?: string; notes?: string }):
      Observable<DeliveryView> {
    return this.http.patch<DeliveryView>(`/api/admin/deliveries/${orderId}`, data);
  }

  // clientes
  customers(q: string, page = 0): Observable<Page<CustomerRow>> {
    return this.http.get<Page<CustomerRow>>('/api/admin/customers', { params: params({ q, page }) });
  }
  customer(id: number): Observable<CustomerDetail> {
    return this.http.get<CustomerDetail>(`/api/admin/customers/${id}`);
  }

  // dashboard / relatorios
  dashboard(): Observable<Dashboard> {
    return this.http.get<Dashboard>('/api/admin/dashboard');
  }
  salesReport(from: string, to: string, groupBy: 'day' | 'product' | 'category'):
      Observable<SalesRow[]> {
    return this.http.get<SalesRow[]>('/api/admin/reports/sales',
      { params: params({ from, to, groupBy }) });
  }
  salesReportCsvUrl(from: string, to: string, groupBy: string): string {
    return `/api/admin/reports/sales?from=${from}&to=${to}&groupBy=${groupBy}&format=csv`;
  }

  // configuracoes
  settings(): Observable<SettingsDto> {
    return this.http.get<SettingsDto>('/api/admin/settings');
  }
  saveSettings(data: SettingsDto): Observable<SettingsDto> {
    return this.http.put<SettingsDto>('/api/admin/settings', data);
  }
  uploadLogo(file: File): Observable<SettingsDto> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<SettingsDto>('/api/admin/settings/logo', form);
  }
}

// ---------------------------------------------------------------- plataforma

@Injectable({ providedIn: 'root' })
export class PlatformApi {
  private http = inject(HttpClient);

  tenants(): Observable<TenantRow[]> {
    return this.http.get<TenantRow[]>('/api/platform/tenants');
  }
  createTenant(data: { name: string; slug: string; adminName: string; adminEmail: string;
      adminPassword: string; domains?: string[]; themeColor?: string }): Observable<TenantRow> {
    return this.http.post<TenantRow>('/api/platform/tenants', data);
  }
  getTenant(id: number): Observable<TenantDetail> {
    return this.http.get<TenantDetail>(`/api/platform/tenants/${id}`);
  }
  updateTenant(id: number, data: { name: string; themeColor?: string }): Observable<TenantDetail> {
    return this.http.put<TenantDetail>(`/api/platform/tenants/${id}`, data);
  }
  changeStatus(id: number, status: 'ATIVO' | 'SUSPENSO'): Observable<TenantDetail> {
    return this.http.patch<TenantDetail>(`/api/platform/tenants/${id}/status`, { status });
  }
  addDomain(id: number, domain: string): Observable<TenantDetail> {
    return this.http.post<TenantDetail>(`/api/platform/tenants/${id}/domains`, { domain });
  }
  removeDomain(id: number, domainId: number): Observable<TenantDetail> {
    return this.http.delete<TenantDetail>(`/api/platform/tenants/${id}/domains/${domainId}`);
  }
  setPrimaryDomain(id: number, domainId: number): Observable<TenantDetail> {
    return this.http.patch<TenantDetail>(`/api/platform/tenants/${id}/domains/${domainId}/primary`, {});
  }
  updateTenantUser(id: number, userId: number,
      data: { name: string; email: string; active?: boolean }): Observable<TenantUserRow> {
    return this.http.put<TenantUserRow>(`/api/platform/tenants/${id}/users/${userId}`, data);
  }
  resetTenantUserPassword(id: number, userId: number, password: string): Observable<void> {
    return this.http.post<void>(`/api/platform/tenants/${id}/users/${userId}/password`, { password });
  }
  overview(): Observable<TenantOverview[]> {
    return this.http.get<TenantOverview[]>('/api/platform/overview');
  }

  // administradores da plataforma
  admins(): Observable<PlatformAdminRow[]> {
    return this.http.get<PlatformAdminRow[]>('/api/platform/admins');
  }
  createAdmin(data: { name: string; email: string; password: string }): Observable<PlatformAdminRow> {
    return this.http.post<PlatformAdminRow>('/api/platform/admins', data);
  }
  updateAdmin(id: number, data: { name: string; email: string }): Observable<PlatformAdminRow> {
    return this.http.put<PlatformAdminRow>(`/api/platform/admins/${id}`, data);
  }
  changeAdminPassword(id: number, password: string): Observable<void> {
    return this.http.post<void>(`/api/platform/admins/${id}/password`, { password });
  }
  deleteAdmin(id: number): Observable<void> {
    return this.http.delete<void>(`/api/platform/admins/${id}`);
  }
}
