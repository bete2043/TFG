import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-poda',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './poda.component.html',
  styleUrl: './poda.component.css'
})
export class PodaComponent {
  modalAbierto = true;
  riegoSeleccionado: any = null;
  tipopoda = '';
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
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.cdRef.detectChanges();
      });

    this.fechaActual = new Date().toISOString().split('T')[0];
  }

  ngOnInit() {
    if (this.finca) {
      this.abrirModalYVerHistorial(this.finca);
    }
  }

  cerrarModalDesdeDentro() {
    this.cerrar.emit();
  }

  abrirModalYVerHistorial(riego: any) {
    this.abrirModal(riego);
    this.verHistorial(riego.nombre);
  }

  abrirModal(riego: any) {
    this.modalAbierto = true;
    this.riegoSeleccionado = riego;
  }

  cerrarModal() {
    this.modalAbierto = false;
    this.riegoSeleccionado = null;
  }

  enviarDatos(form: NgForm) {
    if (!form.valid) return;

    const datos = {
      tipopoda: form.value.tipopoda,
      fecha: form.value.fechaSeleccionada,
      olivas: form.value.olivas,
      riegoSeleccionado: this.riegoSeleccionado.nombre
    };

    this.http.post(`http://localhost:5000/poda`, datos).subscribe(
      () => {
        form.resetForm();
        this.tipopoda = '';
        this.olivas = null;
        this.fechaSeleccionada = null;
        this.cerrarModal();
      },
      error => {
        console.error('Error al enviar los datos:', error);
      }
    );
  }

  verHistorial(nombreFinca: string) {
    if (!nombreFinca) return;

    this.http.get<any[]>(`http://localhost:5000/poda/${nombreFinca}`).subscribe(
      response => {
        this.historialVisible = response.sort(
          (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        );
        this.historialPorAnio = this.agruparHistorialPorAnio(this.historialVisible);
        this.extraerAnios();
      },
      error => {
        console.error('Error al obtener el historial', error);
      }
    );
  }

  agruparHistorialPorAnio(historial: any[]): { [anio: string]: any[] } {
    return historial.reduce((acc, registro) => {
      const anio = new Date(registro.fecha).getFullYear().toString();
      acc[anio] = acc[anio] || [];
      acc[anio].push(registro);
      return acc;
    }, {});
  }

  extraerAnios() {
    this.historialAnios = Object.keys(this.historialPorAnio)
      .filter(anio => !isNaN(Number(anio)))
      .sort((a, b) => Number(b) - Number(a));
  }

  cargarHistorialAnio() {
    if (this.anioSeleccionado) {
      this.toggleAnioExpandido(this.anioSeleccionado);
    }
  }

  toggleAnioExpandido(anio: string) {
    this.anioExpandido[anio] = !this.anioExpandido[anio];

    const datos = this.historialPorAnio[anio];
    const formacion = datos.filter(r => r.metodo === 'formacion').reduce((sum, r) => sum + r.olivas, 0);
    const produccion = datos.filter(r => r.metodo === 'produccion').reduce((sum, r) => sum + r.olivas, 0);
    const rejuvenicimiento = datos.filter(r => r.metodo === 'rejuvenicimiento').reduce((sum, r) => sum + r.olivas, 0);

    this.resumenHistorialExpandido[anio] = {
      formacion,
      produccion,
      rejuvenicimiento,
      total: formacion + produccion + rejuvenicimiento
    };
  }

  ocultarHistorial() {
    this.anioSeleccionado = null;
    this.resumenHistorialExpandido = {};
  }

  formatearFecha(fecha: string): string {
    const fechaObj = new Date(fecha);
    const dia = fechaObj.getDate().toString().padStart(2, '0');
    const mes = (fechaObj.getMonth() + 1).toString().padStart(2, '0');
    const anio = fechaObj.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }
}
