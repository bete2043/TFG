import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, ElementRef, HostListener, QueryList, ViewChildren } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { Input, OnChanges, SimpleChanges } from '@angular/core';
import { PlagasComponent } from "../plagas/plagas.component";
import { AbonadoComponent } from "../abonado/abonado.component";
import { FitosanitariosComponent } from "../fitosanitarios/fitosanitarios.component";
import { PodaComponent } from '../poda/poda.component';
import { RecoleccionComponent } from "../recoleccion/recoleccion.component";
import { RiegoComponent } from "../riego/riego.component";



@Component({
  selector: 'app-fincas',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule, PlagasComponent, AbonadoComponent, FitosanitariosComponent, PodaComponent, RecoleccionComponent, RiegoComponent],
  templateUrl: './fincas.component.html',
  styleUrl: './fincas.component.css'
})
export class FincasComponent implements OnChanges{

/* ------------------------------------------------------------------------------------- */
  
 /* FUNCIONES COMUNES */
  modalAbiertoAbonado: boolean = false; 
  modalAbiertoFitosanitario: boolean = false; 
  modalAbiertoPlagas: boolean = false; 
  modalAbiertoPoda: boolean = false; 
  modalAbiertoRecoleccion: boolean = false; 
  modalAbiertoRiego: boolean = false; 
  riegoSeleccionado: any = null;

  abrirModalAbonado(riego: any) {
    this.modalAbiertoAbonado = true;
    this.riegoSeleccionado = riego;
    console.log('Riego seleccionado:', riego);
  }


  abrirModalFitosanitario(riego: any) {
    this.modalAbiertoFitosanitario = true;
    this.riegoSeleccionado = riego;
    console.log('Riego seleccionado:', riego);
  }

  abrirModalPlagas(riego: any) {
    this.modalAbiertoPlagas = true;
    this.riegoSeleccionado = riego;
    console.log('Riego seleccionado:', riego);
  }

  abrirModalPoda(riego: any) {
    this.modalAbiertoPoda = true;
    this.riegoSeleccionado = riego;
    console.log('Riego seleccionado:', riego);
  }

  abrirModalRecoleccion(riego: any) {
    this.modalAbiertoRecoleccion = true;
    this.riegoSeleccionado = riego;
    console.log('Riego seleccionado:', riego);
  }

  abrirModalRiego(riego: any) {
    this.modalAbiertoRiego = true;
    this.riegoSeleccionado = riego;
    console.log('Riego seleccionado:', riego);
  }


  abrirModalYVerHistorial(riego: any, item: string) {
    document.body.classList.add('no-scroll');
      switch (item) {
        case 'abonado':
          this.abrirModalAbonado(riego);
        break;
        case 'fitosanitario':
          this.abrirModalFitosanitario(riego);
        break;
        case 'plagas':
          this.abrirModalPlagas(riego);
        break;
        case 'poda':
          this.abrirModalPoda(riego);
        break;
        case 'recoleccion':
          this.abrirModalRecoleccion(riego);
        break;
        case 'riego':
          this.abrirModalRiego(riego);
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
        this.riegoSeleccionado = null;
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

/* ------------------------------------------------------------------------------------- */


  usuarioAutenticado: string | null = null;
  info: any[] = [];
  indiceActual: number = 0;
  fechaActual: string = '';  
  panelAbierto: boolean = false;
  fincaSeleccionada: any = null;


  /* ------------------------------------------------------------------------------------- */
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

  // Centro del polígono
  const center = this.getCenter(finca.coordenadas);

  // Cerrar el polígono repitiendo el primer punto
  const coords = [...finca.coordenadas, finca.coordenadas[0]];
  const path = coords.map(c => `${c.lat},${c.lng}`).join('|');

  const url = `${base}?center=${center.lat},${center.lng}&zoom=${zoom}&size=${size}&maptype=${maptype}&path=color:0xff0000ff|weight:2|${path}&key=AIzaSyCCeQhaAhcWvW8oFMwCpT0RcqxKrQ72V3s`;

  return url;
}

  
  
  /* ABRIR PANEL LATERAL */
  openPanel(finca: any) {
    this.fincaSeleccionada = finca;
    this.panelAbierto = true;
    document.querySelector('.contenido-central')?.classList.add('panel-abierto');
    console.log('Finca seleccionada:', finca);
  }
  
  cerrarPanel() {
    this.fincaSeleccionada = null;
    this.panelAbierto = false;
    document.querySelector('.contenido-central')?.classList.remove('panel-abierto');
  }

  @Input() finca: any;

ngOnChanges(changes: SimpleChanges) {
  if (changes['finca'] && changes['finca'].currentValue) {
    this.fincaSeleccionada = this.finca;

    // Buscar el índice de la finca recibida en el array info
    const index = this.info.findIndex(f => f.nombre === this.finca.nombre);
    if (index !== -1) {
      this.indiceActual = index;
    }
  }
}
  constructor(private http: HttpClient, private router: Router, private cdRef: ChangeDetectorRef) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      
      // Forzar la detección de cambios
      this.cdRef.detectChanges();
    });

    const hoy = new Date();
    this.fechaActual = hoy.toISOString().split('T')[0]
  }
  
  ngOnInit() {

    const fincaGuardada = localStorage.getItem('fincaSeleccionada');
    if (fincaGuardada) {
      const fincaSeleccionada = JSON.parse(fincaGuardada);
      
      this.fincaSeleccionada = fincaSeleccionada;
  
      // Espera a que se cargue la info para ubicar el índice
      const espera = setInterval(() => {
        if (this.info && this.info.length > 0) {
          const index = this.info.findIndex(f => f.nombre === fincaSeleccionada.nombre);
          if (index !== -1) {
            this.indiceActual = index;
          }
          clearInterval(espera);
        }
      }, 100);
    }
    
    // Obtener el usuario almacenado en localStorage
    this.usuarioAutenticado = localStorage.getItem('usuario');
    console.log('Usuario recuperado de localStorage: ', this.usuarioAutenticado); 
    
    this.http.get<any[]>(`http://localhost:5000/fincas/${this.usuarioAutenticado}`).subscribe(
      (response) => {
        this.info = response;
        this.info.forEach((finca, index) => {
        });
      },
      (error) => {
        console.error('Error al obtener los datos', error);       
      }
    );

    
  }

  getRadio(): number {
    const totalFincas = this.info.length;
    if (totalFincas === 0) return 0;
  
    const tamañoFicha = 74;
    const angulo = Math.PI / totalFincas;
    return tamañoFicha / (2 * Math.tan(angulo));
  }  

  siguiente(): void {
    this.indiceActual = (this.indiceActual + 1) % this.info.length; 
  }

  anterior(): void {
    this.indiceActual = (this.indiceActual - 1 + this.info.length) % this.info.length;  
  }
}
