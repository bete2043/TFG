import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, HostListener } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { Input, OnChanges, SimpleChanges } from '@angular/core';
import { PlagasComponent } from "../plagas/plagas.component";
import { AbonadoComponent } from "../abonado/abonado.component";
import { FitosanitariosComponent } from "../fitosanitarios/fitosanitarios.component";



@Component({
  selector: 'app-fincas',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule, PlagasComponent, AbonadoComponent, FitosanitariosComponent],
  templateUrl: './fincas.component.html',
  styleUrl: './fincas.component.css'
})
export class FincasComponent implements OnChanges{
  usuarioAutenticado: string | null = null;
  currentRoute: string = '';
  menuAbierto: boolean = false;
  info: any[] = [];
  indiceActual: number = 0;
  riegoSeleccionado: any = null;
  tipopoda: string = '';
  olivas: number | null = null;
  fechaActual: string = '';  
  resumenHistorial: { diasLluvia: number; diasRiego: number; litrosLluvia: number; litrosRiego: number; litrosTotales: number; } | undefined;
  resumenHistorialPorAnio: any = {};
  historialPorAnio: { [anio: string]: any[] } = {};  
  historialAnios: string[] = [];
  panelAbierto: boolean = false;
  fincaSeleccionada: any = null;


  anioExpandido: { [anio: string]: boolean } = {};

  /* ABONADO */

  metodoAbonado: string = '';
  cantidad: number | null = null;
  nombreAbono: string | null = null;
  modalAbiertoAbonado: boolean = false; 
  anioSeleccionadoAbonado: string | null = null;
  resumenHistorialExpandidoAbonado: { [anio: string]: any } = {};
  historialVisibleAbonado: any[] = [];
  fechaSeleccionada: string | null = null;  


  abrirModalAbonado(riego: any) {
    this.modalAbiertoAbonado = true;
    this.riegoSeleccionado = riego;
    console.log('Riego seleccionado:', riego);
  }

  enviarDatosAboando(form: NgForm) {
    const datos = {
      metodoAbonado: form.value.metodoAbonado,
      cantidad: form.value.cantidad,
      nombreAbono: form.value.nombreAbono,
      fecha: form.value.fechaSeleccionada,
      riegoSeleccionado: this.riegoSeleccionado.nombre
    };

    this.http.post(`http://localhost:5000/abonado`, datos).subscribe(
      (response) => {
        console.log('Datos enviados con éxito:', response);
/*         alert('Datos guardados correctamente.');
 */
        form.reset(); 
        this.metodoAbonado = ''; 
        this.nombreAbono = ''; 
        this.cantidad = null;
        this.fechaSeleccionada = null;
        this.cerrarModal('abonado');
      },
      (error) => {
        console.error('Error al enviar los datos:', error);
/*         alert('Hubo un error al guardar los datos.');
 */      }
    );
  }

  verHistorialAbonado(nombreFinca: string) {
    if (!nombreFinca) {
      console.error('El nombre de la finca es inválido');
/*       alert('Nombre de finca no válido');
 */      return;
    }

    this.http.get<any[]>(`http://localhost:5000/abonado/${nombreFinca}`).subscribe(
      (response) => {
        this.historialVisibleAbonado = response.sort((a, b) => {
          const fechaA = new Date(a.fecha).getTime();
          const fechaB = new Date(b.fecha).getTime();
          return fechaB - fechaA; 
        });
        
        this.historialPorAnio = this.agruparHistorialPorAnio(this.historialVisibleAbonado);
        console.log('Datos agrupados por año:', this.historialPorAnio);
        console.log('Historial visible:', this.historialVisibleAbonado);
        console.log('Años detectados:', Object.keys(this.historialPorAnio));
        this.historialPorAnio = this.agruparHistorialPorAnio(this.historialVisibleAbonado);
        this.agruparPorAnio();
  },
      (error) => {
        console.error('Error al obtener el historial', error);
/*         alert('No se pudo obtener el historial');
 */      }
    );
  }

  cargarHistorialAnio() {
    if (this.anioSeleccionadoAbonado) {
      this.toggleAnioExpandidoAbonado(this.anioSeleccionadoAbonado);
      console.log('Año seleccionado:', this.anioSeleccionadoAbonado); 
    }
  }   

  toggleAnioExpandidoAbonado(anio: string): void {
    this.anioExpandido[anio] = !this.anioExpandido[anio];

    // Calcular resumen solo si aún no ha sido generado
      const datos = this.historialPorAnio[anio];

      const vecesQuimico = datos.filter((r) => r.metodo === 'quimico').length;
      const vecesOrganico = datos.filter((r) => r.metodo !== 'quimico').length;
      const gramosQuimico = datos
        .filter((r) => r.metodo === 'quimico')
        .reduce((sum, r) => sum + r.cantidad, 0);
      const gramosOrganico = datos
        .filter((r) => r.metodo !== 'quimico')
        .reduce((sum, r) => sum + r.cantidad, 0);

      this.resumenHistorialExpandidoAbonado[anio] = {
        vecesQuimico,
        vecesOrganico,
        gramosQuimico,
        gramosOrganico,
        gramosTotales: gramosQuimico + gramosOrganico,
      };
  }  

  agruparPorAnio() {
    console.log('📌 Datos originales antes de agrupar:', this.historialVisibleAbonado);

    this.historialPorAnio = this.historialVisibleAbonado.reduce((acumulador: any, riego: any) => {
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



  /* ------------------------------------------------------------------------------------- */



  /* FITOSANITARIO */

  metodoFitosanitario: string = '';
  tipofitosaniraio: string = '';
  nombreFitosanitario: string = '';
  cantidadFitosanitario: number | null = null;
  fechaSeleccionadaFitosaniario: string | null = null;
  modalAbiertoFitosanitario: boolean = false; 
  anioSeleccionadoFitosanitario: string | null = null;
  resumenHistorialExpandidoFitosanitario: { [anio: string]: any } = {};
  historialVisibleFitosanitario: any[] = [];
  historialPorAnioFitosanitario: { [anio: string]: any[] } = {};  
  historialAniosFitosanitarios: string[] = [];



  abrirModalFitosanitario(riego: any) {
    this.modalAbiertoFitosanitario = true;
    this.riegoSeleccionado = riego;
    console.log('Riego seleccionado:', riego);
  }

  enviarDatosFitosanitario(form: NgForm) {
    const datos = {
      tipofitosanitario: form.value.tipofitosaniraio,
      cantidadFitosanitario: form.value.cantidadFitosanitario,
      fechaSeleccionadaFitosaniario: form.value.fechaSeleccionadaFitosaniario,
      nombreFitosanitario: form.value.nombreFitosanitario,
      riegoSeleccionado: this.riegoSeleccionado.nombre
    };

    this.http.post(`http://localhost:5000/fitosanitarios`, datos).subscribe(
      (response) => {
        console.log('Datos enviados con éxito:', response);
        alert('Datos guardados correctamente.');

        form.reset(); 
      this.tipofitosaniraio = ''; 
      this.nombreFitosanitario = '';
      this.cantidad = null;
      this.fechaSeleccionada = null;
      this.cerrarModal('fitosanitario');

      },
      (error) => {
        console.error('Error al enviar los datos:', error);
        alert('Hubo un error al guardar los datos.');
      }
    );
  }

  verHistorialFitosanitario(nombreFinca: string) {
    if (!nombreFinca) {
      console.error('El nombre de la finca es inválido');
/*       alert('Nombre de finca no válido');
 */      return;
    }

    this.http.get<any[]>(`http://localhost:5000/fitosanitario/${nombreFinca}`).subscribe(
      (response) => {
        this.historialVisibleFitosanitario = response.sort((a, b) => {
          const fechaA = new Date(a.fecha).getTime();
          const fechaB = new Date(b.fecha).getTime();
          return fechaB - fechaA; 
        });
        
        this.historialPorAnioFitosanitario = this.agruparHistorialPorAnio(this.historialVisibleFitosanitario);
        console.log('Datos agrupados por año:', this.historialPorAnioFitosanitario);
        console.log('Historial visible:', this.historialPorAnioFitosanitario);
        console.log('Años detectados:', Object.keys(this.historialPorAnio));
        this.historialPorAnioFitosanitario = this.agruparHistorialPorAnio(this.historialVisibleFitosanitario);
        this.agruparPorAnio();
  },
      (error) => {
        console.error('Error al obtener el historial', error);
/*         alert('No se pudo obtener el historial');
 */      }
    );
  }

  cargarHistorialAnioFitosanitario() {
    if (this.anioSeleccionadoFitosanitario) {
      this.toggleAnioExpandidoFitosanitario(this.anioSeleccionadoFitosanitario);
      console.log('Año seleccionado:', this.anioSeleccionadoFitosanitario); 
    }
  }   

  toggleAnioExpandidoFitosanitario(anio: string): void {
    this.anioExpandido[anio] = !this.anioExpandido[anio];

    // Calcular resumen solo si aún no ha sido generado
      const datos = this.historialPorAnio[anio];

      const vecesQuimico = datos.filter((r) => r.metodo === 'quimico').length;
      const vecesOrganico = datos.filter((r) => r.metodo !== 'quimico').length;
      const gramosQuimico = datos
        .filter((r) => r.metodo === 'quimico')
        .reduce((sum, r) => sum + r.cantidad, 0);
      const gramosOrganico = datos
        .filter((r) => r.metodo !== 'quimico')
        .reduce((sum, r) => sum + r.cantidad, 0);

      this.resumenHistorialExpandidoFitosanitario[anio] = {
        vecesQuimico,
        vecesOrganico,
        gramosQuimico,
        gramosOrganico,
        gramosTotales: gramosQuimico + gramosOrganico,
      };
  }  

  agruparPorAnioFitosanitario() {
    console.log('📌 Datos originales antes de agrupar:', this.historialVisibleFitosanitario);

    this.historialPorAnioFitosanitario = this.historialVisibleFitosanitario.reduce((acumulador: any, riego: any) => {
      const anio = new Date(riego.fecha).getFullYear();
      if (!acumulador[anio]) {
        acumulador[anio] = [];
      }
      acumulador[anio].push(riego);
      return acumulador;
    }, {});

    console.log('📌 Historial agrupado por año:', this.historialPorAnioFitosanitario);

    this.extraerAnios(); // Asegurar que se llama solo después de agrupar
  }

  /* ------------------------------------------------------------------------------------- */
  
  /* PLAGAS */

  modalAbiertoPlagas: boolean = false; 


  abrirModalPlagas(riego: any) {
    this.modalAbiertoPlagas = true;
    this.riegoSeleccionado = riego;
    console.log('Riego seleccionado:', riego);
  }

/* ------------------------------------------------------------------------------------------ */


  /* FUNCIONES COMUNES */
  abrirModalYVerHistorial(riego: any, item: string) {
      switch (item) {
        case 'abonado':
          this.abrirModalAbonado(riego);
          this.verHistorialAbonado(riego.nombre);
          break;
        case 'fitosanitario':
          this.abrirModalFitosanitario(riego);
          this.verHistorialFitosanitario(riego.nombre);
          break;
        case 'plagas':
          this.abrirModalPlagas(riego);
/*           this.verHistorialFitosanitario(riego.nombre);
 */          break;
        default:
          console.warn(`No se reconoce el tipo de item: ${item}`);
          break;
      }
  }  

  cerrarModal(item: string) {
    switch (item) {
      case 'abonado':
        this.modalAbiertoAbonado = false;
        this.riegoSeleccionado = null;
        break;
      case 'fitosanitario':
        this.modalAbiertoFitosanitario = false;
        break;
      default:
        console.warn(`No se reconoce el tipo de item: ${item}`);
        break;
    }
  }
/*   cerrarModalyHisotrial(item: string){
    this.cerrarModal(item)
    this.ocultarHistorial(item)
  } */

  ocultarHistorial(item : string) {
    if(item === 'abonado'){
      this.anioSeleccionadoAbonado = null;
      this.resumenHistorialExpandidoAbonado = {}; 
    }
    if(item === 'fitosanitario'){
      this.anioSeleccionadoFitosanitario = null;
      this.resumenHistorialExpandidoFitosanitario = {}; 
    }
  }

  /* ABRIR PANEL LATERAL */
  openPanel(finca: any) {
    this.fincaSeleccionada = finca;
    this.panelAbierto = true;
    document.querySelector('.contenido-central')?.classList.add('panel-abierto');
    console.log('Finca seleccionada:', finca);
  }
  
  cerrarPanel() {
    this.fincaSeleccionada = null;
    this.panelAbierto = false;
    document.querySelector('.contenido-central')?.classList.remove('panel-abierto');
  }

  @Input() finca: any;

ngOnChanges(changes: SimpleChanges) {
  if (changes['finca'] && changes['finca'].currentValue) {
    this.fincaSeleccionada = this.finca;

    // Buscar el índice de la finca recibida en el array info
    const index = this.info.findIndex(f => f.nombre === this.finca.nombre);
    if (index !== -1) {
      this.indiceActual = index;
    }
  }
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

    const fincaGuardada = localStorage.getItem('fincaSeleccionada');
    if (fincaGuardada) {
      const fincaSeleccionada = JSON.parse(fincaGuardada);
      
      this.fincaSeleccionada = fincaSeleccionada;
  
      // Espera a que se cargue la info para ubicar el índice
      const espera = setInterval(() => {
        if (this.info && this.info.length > 0) {
          const index = this.info.findIndex(f => f.nombre === fincaSeleccionada.nombre);
          if (index !== -1) {
            this.indiceActual = index;
          }
          clearInterval(espera);
        }
      }, 100);
    }

    // Obtener el usuario almacenado en localStorage
    this.usuarioAutenticado = localStorage.getItem('usuario');
    console.log('Usuario recuperado de localStorage: ', this.usuarioAutenticado); 
    
    this.http.get<any[]>(`http://localhost:5000/fincas/${this.usuarioAutenticado}`).subscribe(
      (response) => {
        this.info = response;
        this.info.forEach((finca, index) => {
        });
        this.agruparPorAnio();
        this.extraerAnios();
      },
      (error) => {
        console.error('Error al obtener los datos', error);       
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

  getRadio(): number {
    const totalFincas = this.info.length;
    if (totalFincas === 0) return 0;
  
    const tamañoFicha = 74;
    const angulo = Math.PI / totalFincas;
    return tamañoFicha / (2 * Math.tan(angulo));
  }  
  

  agruparHistorialPorAnio(historial: any[]): { [anio: string]: any[] } {
    return historial.reduce((acc, registro) => {
      const anio = new Date(registro.fecha).getFullYear().toString(); // Asegúrate de que `fecha` esté en formato Date válido
      if (!acc[anio]) acc[anio] = [];
      acc[anio].push(registro);
      return acc;
    }, {});
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

  inicio(){
    this.router.navigate([''])
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
