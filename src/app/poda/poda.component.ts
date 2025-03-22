import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';


@Component({
  selector: 'app-poda',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './poda.component.html',
  styleUrl: './poda.component.css'
})
export class PodaComponent {
   usuarioAutenticado: string | null = null;
    currentRoute: string = '';
    menuAbierto: boolean = false;
  
    constructor(private router: Router, private cdRef: ChangeDetectorRef) {
      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd)
      ).subscribe((event: NavigationEnd) => {
        this.currentRoute = event.urlAfterRedirects;
        const rutaActual = this.router.url;
        
        // Forzar la detección de cambios
        this.cdRef.detectChanges();
      });
    }
    
    ngOnInit() {
      // Obtener el usuario almacenado en localStorage
      this.usuarioAutenticado = localStorage.getItem('usuario');
      console.log('Usuario recuperado de localStorage: ', this.usuarioAutenticado);  
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
      console.log('Menú abierto:', this.menuAbierto); 
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
    // Función para verificar si la ruta es la activa
    isActive(route: string): boolean {
      return this.currentRoute.includes(route);
    }
}
