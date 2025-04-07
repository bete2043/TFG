import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, HostListener } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-plagas',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './plagas.component.html',
  styleUrl: './plagas.component.css'
})
export class PlagasComponent {usuarioAutenticado: string | null = null;
    currentRoute: string = '';
    menuAbierto: boolean = false;
    info: any[] = [];
    indiceActual: number = 0;
    modalAbierto: boolean = false; 
    riegoSeleccionado: any = null;
    tipoaceituna: string = '';
    cantidad: number | null = null;
    olivas: number | null = null;
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
      // Obtener el usuario almacenado en localStorage
      this.usuarioAutenticado = localStorage.getItem('usuario');
      console.log('Usuario recuperado de localStorage: ', this.usuarioAutenticado); 
      
      this.http.get<any[]>(`http://localhost:5000/fincas/${this.usuarioAutenticado}`).subscribe(
        (response) => {
          this.info = response;
          this.info.forEach((finca, index) => {
            this.obtenerUltimoCura(finca.nombre, index);
          });
          this.agruparPorAnio();
          this.extraerAnios();
        },
        (error) => {
          console.error('Error al obtener los datos', error);       
        }
      );
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
    obtenerUltimoCura(nombreFinca: string, index: number): void {
      this.http.get<any[]>(`http://localhost:5000/recoleccion/${nombreFinca}`).subscribe(
        (historial) => {
          if (this.info && this.info[index]) { 
            if (historial.length > 0) {
              historial.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
              this.info[index].ultima_recoleccion = this.formatearFecha(historial[0].fecha);
            } else {
              this.info[index].ultima_recoleccion = 'No hay registros';
            }
          }
        },
        (error) => {
          console.error(`Error al obtener el historial de ${nombreFinca}`, error);
          if (this.info && this.info[index]) { 
            this.info[index].ultima_recoleccion = 'No hay registros';
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
        alert('Nombre de finca no válido');
        return;
      }

      this.http.get<any[]>(`http://localhost:5000/recoleccion/${nombreFinca}`).subscribe(
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
          alert('No se pudo obtener el historial');
        }
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

      const picual = datos
        .filter((r) => r.metodo === 'picual')
        .reduce((sum, r) => sum + r.olivas, 0);

        const arbequina = datos
        .filter((r) => r.metodo === 'arbequina')
        .reduce((sum, r) => sum + r.olivas, 0);

        const hojiblanca = datos
        .filter((r) => r.metodo === 'hojiblanca')
        .reduce((sum, r) => sum + r.olivas, 0);

      const kgpicual = datos
        .filter((r) => r.metodo === 'picual')
        .reduce((sum, r) => sum + r.cantidad, 0);
      const kgarbequina = datos
        .filter((r) => r.metodo === 'arbequina')
        .reduce((sum, r) => sum + r.cantidad, 0);
      const kghojiblanca = datos
        .filter((r) => r.metodo === 'hojiblanca')
        .reduce((sum, r) => sum + r.cantidad, 0);

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
        (response) => {
          console.log('Datos enviados con éxito:', response);
          alert('Datos guardados correctamente.');

          form.reset(); 
        this.tipoaceituna = ''; 
        this.olivas = null;
        this.cantidad = null;
        this.fechaSeleccionada = null;
        this.cerrarModal();

        },
        (error) => {
          console.error('Error al enviar los datos:', error);
          alert('Hubo un error al guardar los datos.');
        }
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
    getInicial(): string {
      return this.usuarioAutenticado ? this.usuarioAutenticado.charAt(0).toUpperCase() : '';
    } 
  
    cerrarSesion() {
      localStorage.removeItem('usuario');
      this.usuarioAutenticado = null;
      this.menuAbierto = false; 
      this.router.navigate(['/']); 
      this.cdRef.detectChanges();
    }
  
    perfil() {
      this.router.navigate(['/perfil']); 
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
    
    iniciarSesion(){
      this.router.navigate(['/login'])
    }

    isActive(route: string): boolean {
      return this.currentRoute.includes(route);
    }

    siguiente(): void {
      this.indiceActual = (this.indiceActual + 1) % this.info.length; 
    }
  
    anterior(): void {
      this.indiceActual = (this.indiceActual - 1 + this.info.length) % this.info.length;  
    }
}
