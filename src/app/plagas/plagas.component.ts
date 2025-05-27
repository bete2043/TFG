import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-plagas',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './plagas.component.html',
  styleUrls: ['./plagas.component.css']
})
export class PlagasComponent implements OnInit {
  currentRoute: string = '';
  menuAbierto = false;
  info: any[] = [];
  indiceActual = 0;
  modalAbierto = true;
  riegoSeleccionado: any = null;
  tipoplaga = '';
  gradoafectacion = '';
  tratamiento = '';
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
    this.historialPorAnio = this.historialVisible.reduce((acc: any, riego: any) => {
      const anio = new Date(riego.fecha).getFullYear();
      if (!acc[anio]) {
        acc[anio] = [];
      }
      acc[anio].push(riego);
      return acc;
    }, {});
    this.extraerAnios();
  }

  extraerAnios() {
    if (!this.historialPorAnio || Object.keys(this.historialPorAnio).length === 0) {
      return;
    }
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

    this.http.get<any[]>(`http://localhost:5000/plagas/${nombreFinca}`).subscribe(
      (response) => {
        this.historialVisible = response.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        this.agruparPorAnio();
      },
      () => { /* manejar error si necesario */ }
    );
  }

  toggleAnioExpandido(anio: string): void {
    this.anioExpandido[anio] = !this.anioExpandido[anio];

    const datos = this.historialPorAnio[anio];
    const mosca = datos.filter(r => r.metodo === 'mosca').reduce((sum, r) => sum + r.olivas, 0);
    const polilla = datos.filter(r => r.metodo === 'polilla').reduce((sum, r) => sum + r.olivas, 0);
    const cochinilla = datos.filter(r => r.metodo === 'cochinilla').reduce((sum, r) => sum + r.olivas, 0);
    const leve = datos.filter(r => r.afectacion === 'leve').reduce((sum, r) => sum + r.olivas, 0);
    const media = datos.filter(r => r.afectacion === 'media').reduce((sum, r) => sum + r.olivas, 0);
    const severa = datos.filter(r => r.afectacion === 'severa').reduce((sum, r) => sum + r.olivas, 0);

    this.resumenHistorialExpandido[anio] = {
      mosca,
      polilla,
      cochinilla,
      total: mosca + polilla + cochinilla,
      salvadas: leve + media,
      severa
    };
  }

  abrirModalYVerHistorial(riego: any) {
    this.abrirModal(riego);
    this.verHistorial(riego.nombre);
  }

  enviarDatos(form: NgForm) {
    if (!form.valid) return;

    const datos = {
      tipoplaga: form.value.tipoplaga,
      gradoafectacion: form.value.gradoafectacion,
      tratamiento: form.value.tratamiento,
      fecha: form.value.fechaSeleccionada,
      olivas: form.value.olivas,
      riegoSeleccionado: this.riegoSeleccionado.nombre
    };

    this.http.post(`http://localhost:5000/plagas`, datos).subscribe(
      () => {
        form.resetForm();
        this.tipoplaga = '';
        this.olivas = null;
        this.gradoafectacion = '';
        this.tratamiento = '';
        this.fechaSeleccionada = null;
        this.cerrarModal();
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
