import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, AfterViewInit } from '@angular/core';
import {  RouterModule, Routes } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';

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
          const coords = finca.coordenadas; 
          this.dibujarPoligono(coords);
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


  dibujarPoligono(coords: {lat: number, lng: number}[]) {
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
  
    this.mostrarFormulario = true;
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
