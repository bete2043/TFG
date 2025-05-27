import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, AfterViewInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

declare var google: any;

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './mapa.component.html',
  styleUrls: ['./mapa.component.css'],
})
export class MapaComponent implements AfterViewInit {
  map: any;
  drawingManager: any;
  polygon: any;
  mostrarFormulario = false;
  nuevoPoligono: any = {};

  constructor(private http: HttpClient) {}

  ngAfterViewInit() {
    this.initMap();
    this.initDrawingManager();
    const usuario = localStorage.getItem('usuario');
    if (usuario) {
      this.cargarFincasDelUsuario(usuario);
    }
  }

  cargarFincasDelUsuario(usuario: string) {
    this.http.get<any[]>(`http://localhost:5000/fincas/${usuario}`).subscribe((data) => {
      for (const finca of data) {
        this.dibujarPoligono(finca);
      }
    });
  }

  dibujarPoligono(finca: any) {
    const coords = finca.coordenadas;

    const polygon = new google.maps.Polygon({
      paths: coords,
      strokeColor: '#FF0000',
      strokeOpacity: 0.5,
      strokeWeight: 2,
      fillColor: '#FF0000',
      fillOpacity: 0.25,
      editable: false,
    });

    polygon.setMap(this.map);

    let latSum = 0;
    let lngSum = 0;
    coords.forEach((coord: { lat: number; lng: number }) => {
      latSum += coord.lat;
      lngSum += coord.lng;
    });
    const centroide = {
      lat: latSum / coords.length,
      lng: lngSum / coords.length,
    };

    const infoContent = `
      <div style="
        font-family: Arial, sans-serif;
        padding: 8px 12px;
        border-radius: 8px;
        background: #ffffff;
        border: 1px solid #ccc;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        max-width: 240px;
      ">
        <h4 style="margin: 0 0 4px 0; font-size: 19px; color:rgb(0, 0, 0);">${finca.nombre}</h4>
        <p style="margin: 2px 0; font-size: 14px; color: #555;">
          <strong>Olivos:</strong> ${finca.olivos}<br>
          <strong>Hectáreas:</strong> ${finca.superficie}
        </p>
        <div style="margin-top: 8px;">
          <button id="btnEliminar-${finca.id}" style="margin-right: 6px; padding: 4px 8px; font-size: 13px;">Eliminar</button>
        </div>
      </div>
    `;

    const infoWindow = new google.maps.InfoWindow({
      content: infoContent,
      position: centroide,
      disableAutoPan: true,
      pixelOffset: new google.maps.Size(0, -30),
    });

    polygon.addListener('click', () => {
      infoWindow.open(this.map);
    });

    google.maps.event.addListenerOnce(infoWindow, 'domready', () => {
      const btnEliminar = document.getElementById(`btnEliminar-${finca.id}`);

      if (btnEliminar) {
        btnEliminar.addEventListener('click', () => this.eliminarFinca(finca.id, polygon, infoWindow));
      }
    });
  }

  eliminarFinca(fincaId: string, polygon: any, infoWindow: any) {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción eliminará la finca permanentemente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
    }).then((result) => {
      if (result.isConfirmed) {
        this.http.delete(`http://localhost:5000/fincas/${fincaId}`).subscribe({
          next: () => {
            Swal.fire('¡Eliminada!', 'La finca se ha eliminado correctamente.', 'success');
            polygon.setMap(null);
            infoWindow.close();
          },
          error: (err) => {
            Swal.fire('Error', 'Hubo un problema al eliminar la finca.', 'error');
          },
        });
      }
    });
  }

  initMap() {
    const options = {
      center: { lat: 37.7798, lng: -3.779 },
      zoom: 14,
      mapTypeId: 'hybrid',
    };

    this.map = new google.maps.Map(document.getElementById('map') as HTMLElement, options);

    this.map.setOptions({
      styles: [
        {
          elementType: 'labels',
          stylers: [{ visibility: 'on' }],
        },
      ],
    });
  }

  initDrawingManager() {
    this.drawingManager = new google.maps.drawing.DrawingManager({
      drawingMode: google.maps.drawing.OverlayType.POLYGON,
      drawingControl: true,
      drawingControlOptions: {
        position: google.maps.ControlPosition.TOP_CENTER,
        drawingModes: ['polygon'],
      },
      polygonOptions: {
        editable: true,
        strokeColor: '#FF0000',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#FF0000',
        fillOpacity: 0.35,
      },
    });

    this.drawingManager.setMap(this.map);

    google.maps.event.addListener(this.drawingManager, 'overlaycomplete', (event: any) => {
      if (event.type === 'polygon') {
        if (this.polygon) {
          this.polygon.setMap(null);
        }
        this.polygon = event.overlay;
        this.handlePolygon();
      }
    });
  }

  confirmarGuardado() {
    if (this.nuevoPoligono.nombre && this.nuevoPoligono.olivos > 0) {
      this.savePolygon(this.nuevoPoligono);
      this.mostrarFormulario = false;
      window.location.reload();
    } else {
      alert('Por favor, completa todos los campos.');
    }
  }

  cancelarGuardado() {
    this.mostrarFormulario = false;
    if (this.polygon) {
      this.polygon.setMap(null);
      this.polygon = null;
    }
  }

  handlePolygon() {
    const path = this.polygon.getPath();
    const coordinates = [];

    for (let i = 0; i < path.getLength(); i++) {
      const latLng = path.getAt(i);
      coordinates.push({ lat: latLng.lat(), lng: latLng.lng() });
    }

    const areaMeters2 = google.maps.geometry.spherical.computeArea(path);
    const areaHectares = areaMeters2 / 10000;

    this.nuevoPoligono = {
      superficie: areaHectares.toFixed(2),
      coordenadas: coordinates,
    };

    this.generarImagenEstatica(coordinates);

    this.mostrarFormulario = true;
  }

  generarImagenEstatica(coords: { lat: number; lng: number }[]) {
    const apiKey = 'AIzaSyCCeQhaAhcWvW8oFMwCpT0RcqxKrQ72V3s';
    const size = 640;
    const sizeStr = `${size}x${size}`;

    // 1. Calcular bounding box
    const lats = coords.map(p => p.lat);
    const lngs = coords.map(p => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const center = {
      lat: (minLat + maxLat) / 2,
      lng: (minLng + maxLng) / 2
    };

    // 2. Calcular deltas
    const latDelta = Math.abs(maxLat - minLat);
    const lngDelta = Math.abs(maxLng - minLng);
    const maxDelta = Math.max(latDelta, lngDelta);

    // 3. Calcular zoom dinámico
    const zoom = this.calcularZoom(maxDelta, size);

    const pathParam = coords.map((p) => `${p.lat},${p.lng}`).join('|');

    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${center.lat},${center.lng}&zoom=${zoom}&size=
    ${sizeStr}&maptype=satellite&path=fillcolor:0xAA000033|color:0xFFFFFF00|weight:2|${pathParam}&key=${apiKey}`;

    fetch(staticMapUrl)
      .then((res) => res.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Image = reader.result as string;

          const pixelCoords = this.convertCoordsToImagePixels(coords, center, zoom, size, size);

          this.enviarAlBackend(base64Image, pixelCoords, zoom);
        };
        reader.readAsDataURL(blob);
      });
  }

  // Esta función ajusta el zoom según el delta (rango geográfico)
  calcularZoom(delta: number, imageSize: number): number {
    const WORLD_DIM = 256;
    const ZOOM_MAX = 21;

    const fraction = delta / 360;
    const zoom = Math.floor(Math.log2(imageSize / (WORLD_DIM * fraction)));
    return Math.min(zoom, ZOOM_MAX);
  }


  enviarAlBackend(imagenBase64: string, pixelCoords: { x: number; y: number }[], zoom: number) {
    this.http
      .post('http://localhost:5000/contar_olivos', {
        imagen: imagenBase64,
        poligono: pixelCoords,
        zoom: zoom
      })
      .subscribe(
        (res) => {
          const olivos = (res as any).olivos;
          this.nuevoPoligono.olivos = olivos;
          //alert(`Se detectaron ${olivos} olivos.`);
        },
        () => {
          //alert('Error al detectar olivos 0.');
          this.nuevoPoligono.olivos = 0;
        }
      );
  }

  convertCoordsToImagePixels(
    coords: { lat: number; lng: number }[],
    center: { lat: number; lng: number },
    zoom: number,
    width: number,
    height: number
  ): { x: number; y: number }[] {
    const TILE_SIZE = 256;

    const latLngToPoint = (lat: number, lng: number) => {
      const siny = Math.sin((lat * Math.PI) / 180);
      const boundedSiny = Math.min(Math.max(siny, -0.9999), 0.9999);
      return {
        x: TILE_SIZE * (0.5 + lng / 360),
        y: TILE_SIZE * (0.5 - Math.log((1 + boundedSiny) / (1 - boundedSiny)) / (4 * Math.PI)),
      };
    };

    const scale = Math.pow(2, zoom);
    const centerPx = latLngToPoint(center.lat, center.lng);

    return coords.map((coord) => {
      const point = latLngToPoint(coord.lat, coord.lng);
      return {
        x: Math.round((point.x - centerPx.x) * scale + width / 2),
        y: Math.round((point.y - centerPx.y) * scale + height / 2),
      };
    });
  }

  savePolygon(polygonData: any) {
    const usuario = localStorage.getItem('usuario');

    if (!usuario) {
      alert('No se ha podido identificar al usuario.');
      return;
    }

    this.http.post(`http://localhost:5000/fincas/${usuario}`, polygonData).subscribe(
      () => {},
      (error) => {
        console.error('Error guardando finca:', error);
      }
    );
  }
}
