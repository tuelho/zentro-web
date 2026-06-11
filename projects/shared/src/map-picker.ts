import {
  AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges,
  OnDestroy, Output, SimpleChanges, ViewChild,
} from '@angular/core';
import * as L from 'leaflet';

export interface MapPin {
  lat: number;
  lng: number;
  label?: string;
}

/**
 * Mapa Leaflet/OpenStreetMap.
 * - Modo picker (padrao): um pin arrastavel; clique reposiciona; emite positionChange.
 * - Modo pins: lista de marcadores somente leitura (ex.: entregas do dia).
 * Usa divIcon (pin em CSS) para nao depender dos assets de imagem do Leaflet.
 */
@Component({
  selector: 'z-map',
  standalone: true,
  template: '<div #map class="z-map"></div>',
  styles: [`
    :host { display: block; }
    .z-map { height: 100%; width: 100%; min-height: 300px; border-radius: 10px; }
    :host ::ng-deep .z-pin {
      width: 28px; height: 28px; border-radius: 50% 50% 50% 0;
      background: var(--z-blue, #2563EB);
      transform: rotate(-45deg); margin: -14px 0 0 -14px;
      border: 3px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,.4);
    }
    :host ::ng-deep .z-pin::after {
      content: ''; width: 8px; height: 8px; border-radius: 50%;
      background: #fff; position: absolute; top: 7px; left: 7px;
    }
  `],
})
export class ZMap implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('map', { static: true }) mapEl!: ElementRef<HTMLDivElement>;

  @Input() lat = -18.91;
  @Input() lng = -48.26;
  @Input() zoom = 15;
  @Input() readonly = false;
  /** quando informado, vira mapa de multiplos pins somente leitura */
  @Input() pins: MapPin[] | null = null;
  @Output() positionChange = new EventEmitter<{ lat: number; lng: number }>();

  private map?: L.Map;
  private marker?: L.Marker;
  private pinLayer?: L.LayerGroup;

  private icon(): L.DivIcon {
    return L.divIcon({ className: '', html: '<div class="z-pin"></div>', iconSize: [0, 0] });
  }

  ngAfterViewInit(): void {
    this.map = L.map(this.mapEl.nativeElement, { attributionControl: true })
      .setView([this.lat, this.lng], this.zoom);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.map);

    if (this.pins) {
      this.renderPins();
    } else {
      this.marker = L.marker([this.lat, this.lng], {
        draggable: !this.readonly,
        icon: this.icon(),
      }).addTo(this.map);
      this.marker.on('dragend', () => this.emitPosition());
      if (!this.readonly) {
        this.map.on('click', (e: L.LeafletMouseEvent) => {
          this.marker!.setLatLng(e.latlng);
          this.emitPosition();
        });
      }
    }
    // garante o calculo correto do tamanho quando aberto dentro de dialog/steps
    setTimeout(() => this.map?.invalidateSize(), 150);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map) return;
    if (changes['pins'] && this.pins) {
      this.renderPins();
    }
    if ((changes['lat'] || changes['lng']) && this.marker) {
      this.marker.setLatLng([this.lat, this.lng]);
      this.map.setView([this.lat, this.lng], this.map.getZoom());
    }
  }

  /** centraliza na localizacao atual do navegador */
  useMyLocation(): void {
    navigator.geolocation?.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      this.map?.setView([latitude, longitude], 17);
      this.marker?.setLatLng([latitude, longitude]);
      this.emitPosition();
    });
  }

  private renderPins(): void {
    this.pinLayer?.remove();
    this.pinLayer = L.layerGroup(
      (this.pins ?? []).map((p) => {
        const marker = L.marker([p.lat, p.lng], { icon: this.icon() });
        if (p.label) marker.bindPopup(p.label);
        return marker;
      }),
    ).addTo(this.map!);
    const valid = (this.pins ?? []).filter((p) => p.lat != null && p.lng != null);
    if (valid.length > 0) {
      this.map!.fitBounds(L.latLngBounds(valid.map((p) => [p.lat, p.lng] as [number, number])),
        { padding: [30, 30], maxZoom: 16 });
    }
  }

  private emitPosition(): void {
    const pos = this.marker!.getLatLng();
    this.positionChange.emit({ lat: pos.lat, lng: pos.lng });
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }
}
