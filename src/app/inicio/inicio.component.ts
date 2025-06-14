import { Component, HostListener, ChangeDetectorRef } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { PerfilComponent } from "../perfil/perfil.component";
import { NoticiasComponent } from "../noticias/noticias.component";
import { FincasComponent } from "../fincas/fincas.component";
import { MapaComponent } from '../mapa/mapa.component';
import { UsuarioService } from '../../usuario.service';



@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [RouterModule, CommonModule, PerfilComponent, NoticiasComponent, FincasComponent, MapaComponent],
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.css']
})
export class InicioComponent {
            
  usuarioAutenticado: string | null = null;
  currentRoute: string = '';
  menuAbierto: boolean = false;
  
  info: any[] = [];

  constructor(private http: HttpClient, private router: Router, private cdRef: ChangeDetectorRef,  private usuarioService: UsuarioService) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentRoute = event.urlAfterRedirects;
      const rutaActual = this.router.url;
      
      this.cdRef.detectChanges();
    });
  }
  
  ngOnInit() {
    this.usuarioService.usuario$.subscribe(usuario => {
      this.usuarioAutenticado = usuario;
      this.cdRef.detectChanges(); 
    });
    // Obtener el usuario almacenado en localStorage
    this.usuarioAutenticado = localStorage.getItem('usuario');
    console.log('Usuario recuperado de localStorage: ', this.usuarioAutenticado); 
    
    this.http.get<any[]>(`http://localhost:5000/fincas/${this.usuarioAutenticado}`).subscribe(
      (response) => {
        this.info = response;
        this.info.forEach((finca, index) => {
        });
        this.seccionActual = 'noticias';
      },
      (error) => {
        console.error('Error al obtener los datos', error);       
      }
    );
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

  fincasAbierto = false;

  toggleFincas(estado: boolean) {
    this.fincasAbierto = estado;
  }
  
  fincaSeleccionada: any = null;
  seleccionarFinca(finca: any) {
    localStorage.setItem('fincaSeleccionada', JSON.stringify(finca));
    this.fincaSeleccionada = finca;  
    this.mostrarContenido('fincas');
  }
  


  perfil() {
    this.router.navigate(['/perfil']); 
  }

  fincas(){
    this.router.navigate(['fincas'])
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

  seccionActual = '';

  mostrarContenido(seccion: string) {
    this.seccionActual = seccion;
  }



}
