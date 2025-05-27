import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { PlagasComponent } from "../plagas/plagas.component";
import { AbonadoComponent } from "../abonado/abonado.component";
import { FitosanitariosComponent } from "../fitosanitarios/fitosanitarios.component";
import { PodaComponent } from '../poda/poda.component';
import { RecoleccionComponent } from "../recoleccion/recoleccion.component";
import { RiegoComponent } from "../riego/riego.component";

@Component({
  selector: 'app-fincas',
  standalone: true,
  imports: [
    RouterModule, 
    CommonModule, 
    FormsModule, 
    PlagasComponent, 
    AbonadoComponent, 
    FitosanitariosComponent, 
    PodaComponent, 
    RecoleccionComponent, 
    RiegoComponent
  ],
  templateUrl: './fincas.component.html',
  styleUrl: './fincas.component.css'
})
export class FincasComponent implements OnChanges {

  modalAbiertoAbonado = false; 
  modalAbiertoFitosanitario = false; 
  modalAbiertoPlagas = false; 
  modalAbiertoPoda = false; 
  modalAbiertoRecoleccion = false; 
  modalAbiertoRiego = false; 

  fincaSeleccionada: any = null;
  info: any[] = [];
  indiceActual = 0;
  panelAbierto = false;
  usuarioAutenticado: string | null = null;

  @Input() finca: any;

  constructor(private http: HttpClient, private router: Router, private cdRef: ChangeDetectorRef) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.cdRef.detectChanges();
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['finca'] && changes['finca'].currentValue) {
      this.fincaSeleccionada = this.finca;
      const index = this.info.findIndex(f => f.nombre === this.finca.nombre);
      if (index !== -1) {
        this.indiceActual = index;
      }
    }
  }

  ngOnInit() {
    this.usuarioAutenticado = localStorage.getItem('usuario');
    if (this.usuarioAutenticado) {
      this.http.get<any[]>(`http://localhost:5000/fincas/${this.usuarioAutenticado}`).subscribe(
        response => this.info = response,
        error => console.error('Error al obtener los datos', error)
      );
    }

    const fincaGuardada = localStorage.getItem('fincaSeleccionada');
    if (fincaGuardada) {
      this.fincaSeleccionada = JSON.parse(fincaGuardada);
      const espera = setInterval(() => {
        if (this.info.length > 0) {
          const index = this.info.findIndex(f => f.nombre === this.fincaSeleccionada.nombre);
          if (index !== -1) {
            this.indiceActual = index;
          }
          clearInterval(espera);
        }
      }, 100);
    }
  }

  openPanel(finca: any) {
    this.fincaSeleccionada = finca;
    this.panelAbierto = true;
    document.querySelector('.contenido-central')?.classList.add('panel-abierto');
  }

  cerrarPanel() {
    this.fincaSeleccionada = null;
    this.panelAbierto = false;
    document.querySelector('.contenido-central')?.classList.remove('panel-abierto');
  }

  abrirModalYVerHistorial(finca: any, item: string) {
    document.body.classList.add('no-scroll');
    switch (item) {
      case 'abonado':
        this.modalAbiertoAbonado = true;
        break;
      case 'fitosanitario':
        this.modalAbiertoFitosanitario = true;
        break;
      case 'plagas':
        this.modalAbiertoPlagas = true;
        break;
      case 'poda':
        this.modalAbiertoPoda = true;
        break;
      case 'recoleccion':
        this.modalAbiertoRecoleccion = true;
        break;
      case 'riego':
        this.modalAbiertoRiego = true;
        break;
      default:
        console.warn(`No se reconoce el tipo de item: ${item}`);
        break;
    }
  }

  cerrarModal(item: string) {
    switch (item) {
      case 'abonado':
        this.modalAbiertoAbonado = false;
        break;
      case 'fitosanitario':
        this.modalAbiertoFitosanitario = false;
        break;
      case 'plagas':
        this.modalAbiertoPlagas = false;
        break;
      case 'poda':
        this.modalAbiertoPoda = false;
        break;
      case 'recoleccion':
        this.modalAbiertoRecoleccion = false;
        break;
      case 'riego':
        this.modalAbiertoRiego = false;
        break;
      default:
        console.warn(`No se reconoce el tipo de item: ${item}`);
        break;
    }
  }

  siguiente() {
    if (this.info.length > 0) {
      this.indiceActual = (this.indiceActual + 1) % this.info.length;
    }
  }

  anterior() {
    if (this.info.length > 0) {
      this.indiceActual = (this.indiceActual - 1 + this.info.length) % this.info.length;
    }
  }

  getCenter(coordenadas: { lat: number; lng: number }[]): { lat: number; lng: number } {
    const total = coordenadas.length;
    const sum = coordenadas.reduce((acc, coord) => ({
      lat: acc.lat + coord.lat,
      lng: acc.lng + coord.lng
    }), { lat: 0, lng: 0 });
    return {
      lat: sum.lat / total,
      lng: sum.lng / total
    };
  }

  getStaticMapUrl(finca: any): string {
    if (!finca.coordenadas || finca.coordenadas.length === 0) return '';
    const base = 'https://maps.googleapis.com/maps/api/staticmap';
    const size = '600x400';
    const maptype = 'satellite';
    const zoom = 17;
    const center = this.getCenter(finca.coordenadas);
    const coords = [...finca.coordenadas, finca.coordenadas[0]];
    const path = coords.map(c => `${c.lat},${c.lng}`).join('|');
    const apiKey = 'AIzaSyCCeQhaAhcWvW8oFMwCpT0RcqxKrQ72V3s'; // Mejor mover a configuración segura
    return `${base}?center=${center.lat},${center.lng}&zoom=${zoom}&size=${size}&maptype=${maptype}&path=color:0xff0000ff|weight:2|${path}&key=${apiKey}`;
  }

  getRadio(): number {
    const totalFincas = this.info.length;
    if (totalFincas === 0) return 0;
    const tamañoFicha = 74;
    const angulo = Math.PI / totalFincas;
    return tamañoFicha / (2 * Math.tan(angulo));
  }
}
