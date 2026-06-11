import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface AddressLookup {
  street?: string;
  district?: string;
  city?: string;
  state?: string;
  zip?: string;
}

interface ViaCepResponse {
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
}

interface NominatimResponse {
  address?: {
    road?: string;
    suburb?: string;
    neighbourhood?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    postcode?: string;
  };
}

/**
 * Consulta de endereco por CEP (ViaCEP) e geocodificacao reversa (Nominatim/OSM).
 * Usa HttpBackend para nao passar pelos interceptors (sem token nessas chamadas).
 */
@Injectable({ providedIn: 'root' })
export class GeoService {
  private http = new HttpClient(inject(HttpBackend));

  /** Busca endereco pelo CEP. Retorna null se CEP invalido/nao encontrado. */
  lookupCep(cep: string): Observable<AddressLookup | null> {
    const digits = (cep ?? '').replace(/\D/g, '');
    if (digits.length !== 8) return of(null);
    return this.http.get<ViaCepResponse>(`https://viacep.com.br/ws/${digits}/json/`).pipe(
      map((r) =>
        r && !r.erro
          ? {
              street: r.logradouro || undefined,
              district: r.bairro || undefined,
              city: r.localidade || undefined,
              state: r.uf || undefined,
            }
          : null,
      ),
      catchError(() => of(null)),
    );
  }

  /** Geocodificacao direta: a partir do endereco/CEP, devolve a coordenada para posicionar o pin. */
  geocodeAddress(parts: { street?: string; city?: string; state?: string; zip?: string }): Observable<{ lat: number; lng: number } | null> {
    const params = new URLSearchParams({
      format: 'jsonv2',
      limit: '1',
      countrycodes: 'br',
      'accept-language': 'pt-BR',
    });
    if (parts.street) params.set('street', parts.street);
    if (parts.city) params.set('city', parts.city);
    if (parts.state) params.set('state', parts.state);
    if (!parts.street && parts.zip) params.set('postalcode', parts.zip);
    const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
    return this.http.get<{ lat: string; lon: string }[]>(url).pipe(
      map((arr) =>
        arr && arr.length ? { lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon) } : null,
      ),
      catchError(() => of(null)),
    );
  }

  /** Geocodificacao reversa: a partir do pin, devolve rua/bairro/cidade/UF/CEP. */
  reverseGeocode(lat: number, lng: number): Observable<AddressLookup | null> {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1` +
      `&lat=${lat}&lon=${lng}&accept-language=pt-BR`;
    return this.http.get<NominatimResponse>(url).pipe(
      map((r) => {
        const a = r?.address;
        if (!a) return null;
        return {
          street: a.road || undefined,
          district: a.suburb || a.neighbourhood || undefined,
          city: a.city || a.town || a.municipality || a.village || undefined,
          state: a.state || undefined,
          zip: a.postcode || undefined,
        };
      }),
      catchError(() => of(null)),
    );
  }
}
