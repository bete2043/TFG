import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-fitosanitarios',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './fitosanitarios.component.html',
  styleUrls: ['./fitosanitarios.component.css'] // corregido typo: styleUrl -> styleUrls
})
export class FitosanitariosComponent implements OnInit {
  currentRoute: string = '';
  menuAbierto: boolean = false;
  info: any[] = [];               // No se usa en el código actual para la funcionalidad principal, se puede eliminar si no se usa en el template
  indiceActual: number = 0;       // No usado tampoco, eliminar si no se usa
  modalAbierto: boolean = false; 
  riegoSeleccionado: any = null;

  tipofitosaniraio: string = '';  // Aquí hay un typo en el nombre, debe ser tipofitosanitario (consistencia)
  nombreFitosanitario: string = '';
  cantidad: number | null = null;
  fechaSeleccionada: string | null = null;  
  fechaActual: string = '';  

  historialVisible: any[] = [];
  historialPorAnio: { [anio: string]: any[] } = {};  
  resumenHistorialExpandido: { [anio: string]: any } = {};
  anioExpandido: { [anio: string]: boolean } = {};
  anioSeleccionado: string | null = null;
  historialAnios: string[] = [];

  constructor(private http: HttpClient, private router: Router, private cdRef: ChangeDetectorRef) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentRoute = event.urlAfterRedirects;
      this.cdRef.detectChanges();
    });

    const hoy = new Date();
    this.fechaActual = hoy.toISOString().split('T')[0];
  }

  @Input() finca: any;
  @Output() cerrar = new EventEmitter<void>();

  ngOnInit() {
    if (this.finca) {
      this.abrirModalYVerHistorial(this.finca);
    }
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
      if (!acumulador[anio]) {
        acumulador[anio] = [];
      }
      acumulador[anio].push(riego);
      return acumulador;
    }, {});
    this.extraerAnios();
  }

  extraerAnios() {
    if (!this.historialPorAnio || Object.keys(this.historialPorAnio).length === 0) return;
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
    this.http.get<any[]>(`http://localhost:5000/fitosanitarios/${nombreFinca}`).subscribe(
      (response) => {
        this.historialVisible = response.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        this.agruparPorAnio();
      },
      (error) => {
        console.error('Error al obtener el historial', error);
      }
    );
  }

  toggleAnioExpandido(anio: string): void {
    this.anioExpandido[anio] = !this.anioExpandido[anio];
    if (!this.resumenHistorialExpandido[anio]) {
      const datos = this.historialPorAnio[anio];
      const insecticida = datos.filter((r) => r.metodo === 'insecticida').length;
      const fungicida = datos.filter((r) => r.metodo === 'fungicida').length;
      const herbicida = datos.filter((r) => r.metodo === 'herbicida').length;
      const gramosinsecticida = datos.filter((r) => r.metodo === 'insecticida').reduce((sum, r) => sum + r.cantidad, 0);
      const gramosfungicida = datos.filter((r) => r.metodo === 'fungicida').reduce((sum, r) => sum + r.cantidad, 0);
      const gramosherbcida = datos.filter((r) => r.metodo === 'herbicida').reduce((sum, r) => sum + r.cantidad, 0);

      this.resumenHistorialExpandido[anio] = {
        insecticida,
        fungicida,
        herbicida,
        gramosinsecticida,
        gramosfungicida,
        gramosherbcida,
        gramosTotales: gramosinsecticida + gramosfungicida + gramosherbcida,
      };
    }
  }

  abrirModalYVerHistorial(riego: any) {
    this.abrirModal(riego);
    this.verHistorial(riego.nombre);
  }

  enviarDatos(form: NgForm) {
    if (!form.valid) return;
    const datos = {
      tipofitosanitario: form.value.tipofitosaniraio,  // aquí corregiré el typo también en el html si quieres
      cantidad: form.value.cantidad,
      fecha: form.value.fechaSeleccionada,
      nombreFitosanitario: form.value.nombreFitosanitario,
      riegoSeleccionado: this.riegoSeleccionado.nombre
    };

    this.http.post(`http://localhost:5000/fitosanitarios`, datos).subscribe(
      (response) => {
        console.log('Datos enviados con éxito:', response);
        form.resetForm();
        this.tipofitosaniraio = ''; 
        this.nombreFitosanitario = '';
        this.cantidad = null;
        this.fechaSeleccionada = null;
        this.cerrarModal();
      },
      (error) => {
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
