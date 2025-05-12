import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, AfterViewInit } from '@angular/core';
import {  RouterModule, Routes } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import html2canvas from 'html2canvas';

declare var google: any;

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './mapa.component.html',
  styleUrl: './mapa.component.css'
})
export class MapaComponent implements AfterViewInit{

  map: any;
  drawingManager: any;
  polygon: any;
  fincasAbierto: boolean = false;
  mostrarFormulario = false;
  nuevoPoligono: any = {};

  constructor(private http: HttpClient) {}

  cargarFincasDelUsuario(usuario: string) {
    this.http.get<any[]>(`http://localhost:5000/fincas/${usuario}`).subscribe(
      (data) => {
        for (const finca of data) {
          this.dibujarPoligono(finca);
        }
      }
    );
    
  }

  ngAfterViewInit() {
    this.initMap();
    this.initDrawingManager();
    const usuario = localStorage.getItem('usuario');
    if (usuario) {
      this.cargarFincasDelUsuario(usuario);
    }
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
      editable: false
    });
  
    polygon.setMap(this.map);
  
    // Calcular el centroide del polígono
    let latSum = 0;
    let lngSum = 0;
    coords.forEach((coord: { lat: number; lng: number; }) => {
      latSum += coord.lat;
      lngSum += coord.lng;
    });
    const centroide = {
      lat: latSum / coords.length,
      lng: lngSum / coords.length
    };
  
    // Crear y mostrar el InfoWindow sin el botón de cierre
    const infoContent = `
      <div style="
        font-family: Arial, sans-serif;
        padding: 8px 12px;
        border-radius: 8px;
        background: #ffffff;
        border: 1px solid #ccc;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        max-width: 220px;
      ">
        <h4 style="margin: 0 0 4px 0; font-size: 19px; color:rgb(0, 0, 0);">${finca.nombre}</h4>
        <p style="margin: 2px 0; font-size: 14px; color: #555;">
          <strong>Olivos:</strong> ${finca.olivos}<br>
          <strong>Hectáreas:</strong> ${finca.superficie}
        </p>
      </div>
    `;
  
    const infoWindow = new google.maps.InfoWindow({
      content: infoContent,
      position: centroide,
      disableAutoPan: true,
      pixelOffset: new google.maps.Size(0, -30)  // Opcional
    });
  
    // Función para ocultar la "X"
    const ocultarBotonCerrar = () => {
      const closeButton = document.querySelector('.gm-ui-hover-effect') as HTMLElement;
      if (closeButton) {
        closeButton.style.display = 'none';  // Oculta el botón de cierre
      }
    };
  
    // Observar cambios en el DOM para detectar la "X" y ocultarla
    const observer = new MutationObserver(() => {
      ocultarBotonCerrar();  // Oculta la "X" cuando el DOM cambia
    });
  
    // Configuración del observer
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  
    // Mostrar InfoWindow al pasar el mouse
    polygon.addListener('mouseover', () => {
      infoWindow.open(this.map);
  
      // Asegurarse de que el botón de cierre esté oculto cada vez
      ocultarBotonCerrar();
    });
  
    polygon.addListener('mouseout', () => {
      infoWindow.close();
    });
  }
  

  initMap() {
    const options = {
      center: { lat: 37.7798, lng: -3.7790 },  // Coordenadas de Jaén
      zoom: 14,  // Ajusta el nivel de zoom según lo necesites
      mapTypeId: 'hybrid'  // Usamos el mapa híbrido, que combina satélite + carreteras y nombres
    };
  
    this.map = new google.maps.Map(document.getElementById('map') as HTMLElement, options);
  
    // Para asegurarnos de que las etiquetas (nombres de lugares) estén visibles
    this.map.setOptions({
      styles: [
        {
          "elementType": "labels",
          "stylers": [
            {
              "visibility": "on"  // Asegúrate de que las etiquetas estén activadas
            }
          ]
        }
      ]
    });
  }
  
  

  initDrawingManager() {
    this.drawingManager = new google.maps.drawing.DrawingManager({
      drawingMode: google.maps.drawing.OverlayType.POLYGON,
      drawingControl: true,
      drawingControlOptions: {
        position: google.maps.ControlPosition.TOP_CENTER,
        drawingModes: ['polygon']
      },
      polygonOptions: {
        editable: true,
        strokeColor: '#FF0000',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#FF0000',
        fillOpacity: 0.35
      }
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
      alert("Por favor, completa todos los campos.");
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
      coordenadas: coordinates
    };
  
    this.generarImagenEstatica(coordinates);

    this.mostrarFormulario = true;
  }
  
  generarImagenEstatica(coords: {lat: number, lng: number}[]) {
    const apiKey = 'AIzaSyCCeQhaAhcWvW8oFMwCpT0RcqxKrQ72V3s';
    const center = coords[0];
    const zoom = 20;
    const size = '640x640';
    const pathParam = coords.map(p => `${p.lat},${p.lng}`).join('|');

    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${center.lat},${center.lng}&zoom=${zoom}&size=${size}&maptype=satellite&path=fillcolor:0xAA000033|color:0xFFFFFF00|weight:2|${pathParam}&key=${apiKey}`;

    fetch(staticMapUrl)
      .then(res => res.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Image = reader.result as string;

          // Obtener polígono en píxeles relativos
          const pixelCoords = this.convertCoordsToImagePixels(coords, center, zoom, 640, 640);

          this.enviarAlBackend(base64Image, pixelCoords);
        };
        reader.readAsDataURL(blob);
      });
  }
  
  enviarAlBackend(imagenBase64: string, pixelCoords: { x: number; y: number }[]) {
    this.http.post('http://localhost:5000/contar_olivos', {
      imagen: imagenBase64,
      poligono: pixelCoords
    }).subscribe(res => {
      const olivos = (res as any).olivos;
      this.nuevoPoligono.olivos = olivos;
      alert(`Se detectaron ${olivos} olivos.`);
    },
    (error) => {
      alert(`Error al detectar olivos 0.`);
      this.nuevoPoligono.olivos = 0;
    });
  }
  
  

  convertCoordsToImagePixels(coords: { lat: number; lng: number }[], center: { lat: number, lng: number }, zoom: number, width: number, height: number): { x: number; y: number }[] {
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
    const usuario = localStorage.getItem('usuario'); // O como estés guardando el nombre de usuario
  
    if (!usuario) {
      alert("No se ha podido identificar al usuario.");
      return;
    }
  
    this.http.post(`http://localhost:5000/fincas/${usuario}`, polygonData).subscribe(
      (res) => {
        console.log("Respuesta del servidor:", res);
/*         alert("Finca guardada correctamente");
 */      },
      (error) => {
        console.error("Error guardando finca:", error);
/*         alert("Hubo un error al guardar la finca");
 */      }
    );
  }
  

}
