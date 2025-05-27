import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-recoleccion',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './recoleccion.component.html',
  styleUrls: ['./recoleccion.component.css']
})
export class RecoleccionComponent {
  currentRoute: string = '';
  menuAbierto = false;
  info: any[] = [];
  indiceActual = 0;
  modalAbierto = true;
  riegoSeleccionado: any = null;
  tipoaceituna = '';
  cantidad: number | null = null;
  olivas: number | null = null;
  fechaSeleccionada: string | null = null;
  fechaActual = '';
  historialVisible: any[] = [];
  historialPorAnio: { [anio: string]: any[] } = {};
  resumenHistorialExpandido: { [anio: string]: any } = {};
  anioExpandido: { [anio: string]: boolean } = {};
  anioSeleccionado: string | null = null;
  historialAnios: string[] = [];

  @Input() finca: any;
  @Input() modal: any;

  @Output() cerrar = new EventEmitter<void>();

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdRef: ChangeDetectorRef
  ) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentRoute = event.urlAfterRedirects;
      this.cdRef.detectChanges();
    });

    this.fechaActual = new Date().toISOString().split('T')[0];
  }

  ngOnInit() {
    this.abrirModalYVerHistorial(this.finca);
  }

  cerrarModalDesdeDentro() {
    this.cerrar.emit();
  }

  ocultarHistorial() {
    this.anioSeleccionado = null;
    this.resumenHistorialExpandido = {};
  }

  agruparPorAnio() {
    this.historialPorAnio = this.historialVisible.reduce((acumulador: any, riego: any) => {
      const anio = new Date(riego.fecha).getFullYear();
      acumulador[anio] = acumulador[anio] || [];
      acumulador[anio].push(riego);
      return acumulador;
    }, {});
    this.extraerAnios();
  }

  extraerAnios() {
    if (!this.historialPorAnio) return;
    this.historialAnios = Object.keys(this.historialPorAnio)
      .filter(anio => !isNaN(Number(anio)))
      .sort((a, b) => Number(b) - Number(a));
  }

  cargarHistorialAnio() {
    if (this.anioSeleccionado) {
      this.toggleAnioExpandido(this.anioSeleccionado);
    }
  }

  formatearFecha(fecha: string): string {
    const fechaObj = new Date(fecha);
    const dia = fechaObj.getDate().toString().padStart(2, '0');
    const mes = (fechaObj.getMonth() + 1).toString().padStart(2, '0');
    const anio = fechaObj.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }

  verHistorial(nombreFinca: string) {
    if (!nombreFinca) return;
    this.http.get<any[]>(`http://localhost:5000/recoleccion/${nombreFinca}`).subscribe(
      response => {
        this.historialVisible = response.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        this.agruparPorAnio();
      },
      error => {
        console.error('Error al obtener el historial', error);
      }
    );
  }

  toggleAnioExpandido(anio: string): void {
    this.anioExpandido[anio] = !this.anioExpandido[anio];
    const datos = this.historialPorAnio[anio];
    if (!datos) return;

    const sumaPorMetodo = (metodo: string) =>
      datos.filter(r => r.metodo === metodo).reduce((sum, r) => sum + r.olivas, 0);

    const sumaKgPorMetodo = (metodo: string) =>
      datos.filter(r => r.metodo === metodo).reduce((sum, r) => sum + r.cantidad, 0);

    const picual = sumaPorMetodo('picual');
    const arbequina = sumaPorMetodo('arbequina');
    const hojiblanca = sumaPorMetodo('hojiblanca');

    const kgpicual = sumaKgPorMetodo('picual');
    const kgarbequina = sumaKgPorMetodo('arbequina');
    const kghojiblanca = sumaKgPorMetodo('hojiblanca');

    this.resumenHistorialExpandido[anio] = {
      picual,
      arbequina,
      hojiblanca,
      total: picual + arbequina + hojiblanca,
      kgpicual,
      kgarbequina,
      kghojiblanca,
      kgTotales: kgpicual + kgarbequina + kghojiblanca,
      mediaOlivas: Math.round((kgpicual + kgarbequina + kghojiblanca) / (picual + arbequina + hojiblanca)),
    };
  }

  abrirModalYVerHistorial(riego: any) {
    this.abrirModal(riego);
    this.verHistorial(riego.nombre);
  }

  enviarDatos(form: NgForm) {
    const datos = {
      tipoaceituna: form.value.tipoaceituna,
      cantidad: form.value.cantidad,
      fecha: form.value.fechaSeleccionada,
      olivas: form.value.olivas,
      riegoSeleccionado: this.riegoSeleccionado.nombre
    };

    this.http.post(`http://localhost:5000/recoleccion`, datos).subscribe(
      response => {
        form.reset();
        this.tipoaceituna = '';
        this.olivas = null;
        this.cantidad = null;
        this.fechaSeleccionada = null;
        this.cerrarModal();
      },
      error => {
        console.error('Error al enviar los datos:', error);
      }
    );
  }

  abrirModal(riego: any) {
    this.modalAbierto = true;
    this.riegoSeleccionado = riego;
  }

  cerrarModal() {
    this.modalAbierto = false;
    this.riegoSeleccionado = null;
  }

  cerrarModalyHisotrial() {
    this.cerrarModal();
    this.ocultarHistorial();
  }

  toggleMenu(event: Event) {
    event.stopPropagation();
    this.menuAbierto = !this.menuAbierto;
    this.cdRef.detectChanges();
  }

  @HostListener('document:click', ['$event'])
  cerrarMenuSiClicFuera(event: Event) {
    if (!event.target || !(event.target as HTMLElement).closest('.dropdown')) {
      this.menuAbierto = false;
      this.cdRef.detectChanges();
    }
  }
}
