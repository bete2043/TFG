import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { FormsModule, NgForm } from '@angular/forms';

@Component({
  selector: 'app-abonado',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './abonado.component.html',
  styleUrl: './abonado.component.css'
})
export class AbonadoComponent implements OnInit {
  currentRoute: string = '';
  menuAbierto = false;
  modalAbierto = false;
  riegoSeleccionado: any = null;

  metodoAbonado = '';
  cantidad: number | null = null;
  nombreAbono: string | null = null;
  fechaSeleccionada: string | null = null;
  fechaActual = '';

  historialVisible: any[] = [];
  historialPorAnio: { [anio: string]: any[] } = {};
  resumenHistorialExpandido: { [anio: string]: any } = {};
  anioExpandido: { [anio: string]: boolean } = {};
  anioSeleccionado: string | null = null;
  historialAnios: string[] = [];

  @Input() finca: any;
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
    if (this.finca) {
      this.abrirModalYVerHistorial(this.finca);
    }
  }

  cerrarModalDesdeDentro() {
    this.cerrar.emit();
  }

  abrirModal(riego: any) {
    this.modalAbierto = true;
    this.riegoSeleccionado = riego;
  }

  cerrarModal() {
    this.modalAbierto = false;
    this.riegoSeleccionado = null;
  }

  abrirModalYVerHistorial(riego: any) {
    this.abrirModal(riego);
    this.verHistorial(riego.nombre);
  }

  verHistorial(nombreFinca: string) {
    if (!nombreFinca) return;

    this.http.get<any[]>(`http://localhost:5000/abonado/${nombreFinca}`).subscribe(
      (response) => {
        this.historialVisible = response.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        this.historialPorAnio = this.agruparHistorialPorAnio(this.historialVisible);
        this.extraerAnios();
      },
      (error) => {
        console.error('Error al obtener el historial', error);
      }
    );
  }

  agruparHistorialPorAnio(historial: any[]): { [anio: string]: any[] } {
    return historial.reduce((acc, registro) => {
      const anio = new Date(registro.fecha).getFullYear().toString();
      if (!acc[anio]) acc[anio] = [];
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

    if (!this.resumenHistorialExpandido[anio]) {
      const datos = this.historialPorAnio[anio] || [];

      const vecesQuimico = datos.filter(r => r.metodo === 'quimico').length;
      const vecesOrganico = datos.filter(r => r.metodo !== 'quimico').length;
      const gramosQuimico = datos.filter(r => r.metodo === 'quimico').reduce((sum, r) => sum + r.cantidad, 0);
      const gramosOrganico = datos.filter(r => r.metodo !== 'quimico').reduce((sum, r) => sum + r.cantidad, 0);

      this.resumenHistorialExpandido[anio] = {
        vecesQuimico,
        vecesOrganico,
        gramosQuimico,
        gramosOrganico,
        gramosTotales: gramosQuimico + gramosOrganico,
      };
    }
  }

  ocultarHistorial() {
    this.anioSeleccionado = null;
    this.resumenHistorialExpandido = {};
  }

  enviarDatos(form: NgForm) {
    if (!form.valid) return;

    const datos = {
      metodoAbonado: form.value.metodoAbonado,
      cantidad: form.value.cantidad,
      nombreAbono: form.value.nombreAbono,
      fecha: form.value.fechaSeleccionada,
      riegoSeleccionado: this.riegoSeleccionado?.nombre
    };

    this.http.post(`http://localhost:5000/abonado`, datos).subscribe(
      () => {
        form.resetForm();
        this.metodoAbonado = '';
        this.nombreAbono = '';
        this.cantidad = null;
        this.fechaSeleccionada = null;
        this.cerrarModal();
      },
      (error) => {
        console.error('Error al enviar los datos:', error);
      }
    );
  }

  formatearFecha(fecha: string): string {
    const fechaObj = new Date(fecha);
    const dia = fechaObj.getDate().toString().padStart(2, '0');
    const mes = (fechaObj.getMonth() + 1).toString().padStart(2, '0');
    const anio = fechaObj.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }

  toggleMenu(event: Event) {
    event.stopPropagation();
    this.menuAbierto = !this.menuAbierto;
    this.cdRef.detectChanges();
  }

  @HostListener('document:click', ['$event'])
  cerrarMenuSiClicFuera(event: Event) {
    if (!(event.target as HTMLElement).closest('.dropdown')) {
      this.menuAbierto = false;
      this.cdRef.detectChanges();
    }
  }

}
