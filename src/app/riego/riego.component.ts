import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { FormsModule, NgForm } from '@angular/forms';

@Component({
  selector: 'app-riego',
  standalone: true,
imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './riego.component.html',
  styleUrl: './riego.component.css'
})
export class RiegoComponent {
    currentRoute: string = '';
    menuAbierto: boolean = false;
    info: any[] = [];
    indiceActual: number = 0;
    modalAbierto: boolean = true; 
    riegoSeleccionado: any = null;
    metodoRiego: string = '';
    cantidad: number | null = null;
    fechaSeleccionada: string | null = null;  
    fechaActual: string = '';  
    historialVisible: any[] = [];
    resumenHistorial: { diasLluvia: number; diasRiego: number; litrosLluvia: number; litrosRiego: number; litrosTotales: number; } | undefined;
    resumenHistorialPorAnio: any = {};
    historialPorAnio: { [anio: string]: any[] } = {};  
    resumenHistorialExpandido: { [anio: string]: any } = {};
    anioExpandido: { [anio: string]: boolean } = {};
    anioSeleccionado: string | null = null;
    historialAnios: string[] = [];

        @Input() finca: any;
        @Input() modal: any; // La finca actual que quieres mostrar
    
        @Output() cerrar = new EventEmitter<void>();
    
        cerrarModalDesdeDentro() {
          this.cerrar.emit();
        }

    constructor(private http: HttpClient, private router: Router, private cdRef: ChangeDetectorRef) {
      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd)
      ).subscribe((event: NavigationEnd) => {
        this.currentRoute = event.urlAfterRedirects;
        
        // Forzar la detección de cambios
        this.cdRef.detectChanges();
      });

      const hoy = new Date();
      this.fechaActual = hoy.toISOString().split('T')[0]
    }
    
    ngOnInit() {
      this.abrirModalYVerHistorial(this.finca);
    }
    
    ocultarHistorial() {
        this.anioSeleccionado = null;
        this.resumenHistorialExpandido = {}; 
    }
    agruparPorAnio() {
      console.log('📌 Datos originales antes de agrupar:', this.historialVisible);

      this.historialPorAnio = this.historialVisible.reduce((acumulador: any, riego: any) => {
        const anio = new Date(riego.fecha).getFullYear();
        if (!acumulador[anio]) {
          acumulador[anio] = [];
        }
        acumulador[anio].push(riego);
        return acumulador;
      }, {});

      console.log('📌 Historial agrupado por año:', this.historialPorAnio);

      this.extraerAnios(); // Asegurar que se llama solo después de agrupar
    }

    extraerAnios() {
      if (!this.historialPorAnio || Object.keys(this.historialPorAnio).length === 0) {
        console.warn(' No hay datos en historialPorAnio'); 
        return;
      }
    
      // Extrae las claves (años) y ordénalos de mayor a menor
      this.historialAnios = Object.keys(this.historialPorAnio)
        .filter(anio => !isNaN(Number(anio)))  // Filtrar valores incorrectos
        .sort((a, b) => Number(b) - Number(a));
    
      console.log('✅ Años extraídos correctamente:', this.historialAnios);
    }
    
    cargarHistorialAnio() {
      if (this.anioSeleccionado) {
        this.toggleAnioExpandido(this.anioSeleccionado);
        console.log('Año seleccionado:', this.anioSeleccionado); 
      }
    }   
    obtenerUltimoRiego(nombreFinca: string, index: number): void {
      this.http.get<any[]>(`http://localhost:5000/riego/${nombreFinca}`).subscribe(
        (historial) => {
          if (this.info && this.info[index]) { 
            if (historial.length > 0) {
              historial.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
              this.info[index].ultimo_riego = this.formatearFecha(historial[0].fecha);
            } else {
              this.info[index].ultimo_riego = 'No hay registros';
            }
          }
        },
        (error) => {
          console.error(`Error al obtener el historial de ${nombreFinca}`, error);
          if (this.info && this.info[index]) { 
            this.info[index].ultimo_riego = 'No hay registros';
          }
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

    verHistorial(nombreFinca: string) {
      if (!nombreFinca) {
        console.error('El nombre de la finca es inválido');
/*         alert('Nombre de finca no válido');
 */        return;
      }

      this.http.get<any[]>(`http://localhost:5000/riego/${nombreFinca}`).subscribe(
        (response) => {
          this.historialVisible = response.sort((a, b) => {
            const fechaA = new Date(a.fecha).getTime();
            const fechaB = new Date(b.fecha).getTime();
            return fechaB - fechaA; 
          });
          
          this.historialPorAnio = this.agruparHistorialPorAnio(this.historialVisible);
          console.log('Datos agrupados por año:', this.historialPorAnio);
          console.log('Historial visible:', this.historialVisible);
          console.log('Años detectados:', Object.keys(this.historialPorAnio));
          this.historialPorAnio = this.agruparHistorialPorAnio(this.historialVisible);
          this.agruparPorAnio();
    },
        (error) => {
          console.error('Error al obtener el historial', error);
/*           alert('No se pudo obtener el historial');
 */        }
      );
    }

    agruparHistorialPorAnio(historial: any[]): { [anio: string]: any[] } {
      return historial.reduce((acc, registro) => {
        const anio = new Date(registro.fecha).getFullYear().toString(); // Asegúrate de que `fecha` esté en formato Date válido
        if (!acc[anio]) acc[anio] = [];
        acc[anio].push(registro);
        return acc;
      }, {});
    }
  toggleAnioExpandido(anio: string): void {
    this.anioExpandido[anio] = !this.anioExpandido[anio];

    // Calcular resumen solo si aún no ha sido generado
      const datos = this.historialPorAnio[anio];

      const diasLluvia = datos.filter((r) => r.metodo === 'lluvia').length;
      const diasRiego = datos.filter((r) => r.metodo !== 'lluvia').length;
      const litrosLluvia = datos
        .filter((r) => r.metodo === 'lluvia')
        .reduce((sum, r) => sum + r.cantidad, 0);
      const litrosRiego = datos
        .filter((r) => r.metodo !== 'lluvia')
        .reduce((sum, r) => sum + r.cantidad, 0);

      this.resumenHistorialExpandido[anio] = {
        diasLluvia,
        diasRiego,
        litrosLluvia,
        litrosRiego,
        litrosTotales: litrosLluvia + litrosRiego,
      };
  }
  abrirModalYVerHistorial(riego: any) {
    this.abrirModal(riego);
    this.verHistorial(riego.nombre);
  }
    

    enviarDatos(form: NgForm) {
      const datos = {
        metodoRiego: form.value.metodoRiego,
        cantidad: form.value.cantidad,
        fecha: form.value.fechaSeleccionada,
        riegoSeleccionado: this.riegoSeleccionado.nombre
      };

      this.http.post(`http://localhost:5000/riego`, datos).subscribe(
        (response) => {
          console.log('Datos enviados con éxito:', response);
/*           alert('Datos guardados correctamente.');
 */
          form.reset(); 
        this.metodoRiego = ''; 
        this.cantidad = null;
        this.fechaSeleccionada = null;
        this.cerrarModal();

        },
        (error) => {
          console.error('Error al enviar los datos:', error);
/*           alert('Hubo un error al guardar los datos.');
 */        }
      );
    }

    abrirModal(riego: any) {
      this.modalAbierto = true;
      this.riegoSeleccionado = riego;
      console.log('Riego seleccionado:', riego);
    }
  
    cerrarModal() {
      this.modalAbierto = false;
      this.riegoSeleccionado = null;
    }
    cerrarModalyHisotrial(){
      this.cerrarModal()
      this.ocultarHistorial()
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
