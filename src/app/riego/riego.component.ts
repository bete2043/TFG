import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener } from '@angular/core';
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
    usuarioAutenticado: string | null = null;
    currentRoute: string = '';
    menuAbierto: boolean = false;
    info: any[] = [];
    indiceActual: number = 0;
    modalAbierto: boolean = false; 
    riegoSeleccionado: any = null;
    metodoRiego: string = '';
    cantidad: number | null = null;
    fechaSeleccionada: string | null = null;  
    fechaActual: string = '';  
    historialVisible: any[] = [];
  
    constructor(private http: HttpClient, private router: Router, private cdRef: ChangeDetectorRef) {
      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd)
      ).subscribe((event: NavigationEnd) => {
        this.currentRoute = event.urlAfterRedirects;
        const rutaActual = this.router.url;
        
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
      
      this.http.get<any[]>('http://localhost:5000/riego').subscribe(
        (response) => {
          this.info = response;
        },
        (error) => {
          console.error('Error al obtener los datos', error);       
        }
      );
    }

    verHistorial(nombreFinca: string) {
      this.http.get<any[]>(`http://localhost:5000/riego/${nombreFinca}`).subscribe(
        (response) => {
          this.historialVisible = response;
        },
        (error) => {
          console.error('Error al obtener el historial', error);
          alert('No se pudo obtener el historial');
        }
      );
    }
  
    ocultarHistorial() {
      this.historialVisible = [];
    }

    enviarDatos(form: NgForm) {
      const datos = {
        metodoRiego: form.value.metodoRiego,
        cantidad: form.value.cantidad,
        fecha: form.value.fechaSeleccionada,
        riegoSeleccionado: this.riegoSeleccionado.nombre
      };
  
  
      this.http.post('http://localhost:5000/riego', datos).subscribe(
        (response) => {
          console.log('Datos enviados con éxito:', response);
          alert('Datos guardados correctamente.');

          form.reset(); 
        this.metodoRiego = ''; 
        this.cantidad = null;
        this.fechaSeleccionada = null;
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
