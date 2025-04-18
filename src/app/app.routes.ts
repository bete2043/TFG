import { RouterModule, Routes } from '@angular/router';
import { InicioComponent } from './inicio/inicio.component';
import { LoginComponent } from './login/login.component';
import { CrearCuentaComponent } from './crear-cuenta/crear-cuenta.component';
import { NgModule } from '@angular/core';
import { RiegoComponent } from './riego/riego.component';
import { MapaComponent } from './mapa/mapa.component';
import { FitosanitariosComponent } from './fitosanitarios/fitosanitarios.component';
import { PodaComponent } from './poda/poda.component';
import { AbonadoComponent } from './abonado/abonado.component';
import { PlagasComponent } from './plagas/plagas.component';
import { RecoleccionComponent } from './recoleccion/recoleccion.component';
import { PerfilComponent } from './perfil/perfil.component';
import { FincasComponent } from './fincas/fincas.component';

export const routes: Routes = [
     {path:'', component:InicioComponent},
     {path:'login', component:LoginComponent},
     {path: 'crear_cuenta', component:CrearCuentaComponent},
     {path: 'riego', component:RiegoComponent},
     {path: 'mapa', component:MapaComponent},
     {path: 'fitosanitario', component:FitosanitariosComponent},
     {path: 'poda', component:PodaComponent},
     {path: 'abonado', component:AbonadoComponent},
     {path: 'plagas', component:PlagasComponent},
     {path: 'recoleccion', component:RecoleccionComponent},
     {path: 'perfil', component:PerfilComponent},
     {path: 'fincas', component:FincasComponent}
];

@NgModule({
     imports: [RouterModule.forRoot(routes)],
     exports: [RouterModule]
})
export class AppRoutingModule { }