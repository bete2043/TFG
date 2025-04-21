import { Component, OnInit } from '@angular/core';
import {  NavigationEnd, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [RouterModule, FormsModule, CommonModule],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css'
})
export class PerfilComponent {
  // Nuevos campos para inputs
  editNombre = false;
  editEmail = false;
  editPassword = false;

  nuevoNombre = '';
  nuevoEmail = '';
  passwordActual = '';
  passwordNueva = '';
  errorPassword = '';
  usuarioAutenticado: string | null = null;
  perfil: any = {};

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.usuarioAutenticado = localStorage.getItem('usuario');
    if (!this.usuarioAutenticado) return;

    this.http.get(`http://localhost:5000/perfil/${this.usuarioAutenticado}`)
      .subscribe((res: any) => {
        this.perfil = res;
      });
  }

  

guardarCampo(campo: string, valor: string) {
  this.http.put(`http://localhost:5000/perfil/${this.usuarioAutenticado}/modificar`, {
    campo: campo,
    valor: valor
  }).subscribe((res: any) => {
    this.perfil[campo] = valor;
    if (campo === 'username') this.usuarioAutenticado = valor;
  });
}

// Nueva función para cambiar la contraseña
cambiarContrasena() {
  this.errorPassword = '';

  this.http.post(`http://localhost:5000/perfil/${this.usuarioAutenticado}/cambiar-contrasena`, {
    actual: this.passwordActual,
    nueva: this.passwordNueva
  }).subscribe((res: any) => {
    if (res.ok) {
      this.editPassword = false;
      this.passwordActual = '';
      this.passwordNueva = '';
    } else {
      this.errorPassword = res.error;
    }
  });
}


}
