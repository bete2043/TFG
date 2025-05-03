import { Component, OnInit } from '@angular/core';
import {  NavigationEnd, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { UsuarioService } from '../../usuario.service';

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
  repetirEmail = '';
  passwordActual = '';
  passwordNueva = '';
  confirmarPasswordNueva = '';
  errorPassword = '';
  usuarioAutenticado: string | null = null;
  perfil: any = {};

  mensajeNombre = '';
  mensajeEmail = '';
  mensajePassword = '';

  mostrarPasswordActual = false;
  mostrarPasswordNueva = false;
  mostrarConfirmarPasswordNueva = false;


  constructor(private http: HttpClient, private usuarioService: UsuarioService) {}

  ngOnInit(): void {
    this.usuarioAutenticado = localStorage.getItem('usuario');
    if (!this.usuarioAutenticado) return;

    this.cargarPerfil();
  }

  cargarPerfil() {
    this.http.get(`http://localhost:5000/perfil/${this.usuarioAutenticado}`)
      .subscribe((res: any) => {
        this.perfil = res;
      });
  }

  guardarCampo(campo: string, valor: string) {
    if (campo === 'username') {
      this.mensajeNombre = '';
    }
    if (campo === 'email') {
      this.mensajeEmail = '';
    }

    if (campo === 'username') {
      const valorSinEspacios = valor.trim();
  
      // Debe tener al menos una letra (a-zA-Z)
      if (!/[a-zA-Z]/.test(valorSinEspacios)) {
        this.mensajeNombre = 'El nombre debe contener al menos una letra.';
        return;
      }
  
      // Si está vacío
      if (valorSinEspacios.length === 0) {
        this.mensajeNombre = 'El nombre no puede estar vacío.';
        return;
      }
    }

    // Para el EMAIL: validar primero
    if (campo === 'email') {
      if (this.nuevoEmail !== this.repetirEmail) {
        this.mensajeEmail = 'Los emails no coinciden.';
        return;
      }
      const patronEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!patronEmail.test(this.nuevoEmail)) {
        this.mensajeEmail = 'El formato del email no es válido.';
        return;
      }
    }

    this.http.put(`http://localhost:5000/perfil/${this.usuarioAutenticado}/modificar`, {
      campo: campo,
      valor: valor
    }).subscribe(
      (res: any) => {
        if (res.error) {
          // Si backend devuelve error (por ejemplo "usuario en uso")
          if (campo === 'username') {
            this.mensajeNombre = 'Nombre de usuario en uso.';
          }
          if (campo === 'email') {
            this.mensajeEmail = 'Error al cambiar el email.';
          }
        } else {
          // Éxito
          this.perfil[campo] = valor;
          if (campo === 'username') {
            this.usuarioAutenticado = valor;
            localStorage.setItem('usuario', valor);
            this.usuarioService.actualizarUsuario(valor);
            this.mensajeNombre = 'Nombre de usuario modificado con éxito.';
            this.editNombre = false;
          }
          if (campo === 'email') {
            this.mensajeEmail = 'Email modificado con éxito.';
            this.editEmail = false;
          }

          // Limpiar campos
          this.nuevoNombre = '';
          this.nuevoEmail = '';
          this.repetirEmail = '';

          this.cargarPerfil();
        }
      },
      (error) => {
        if (campo === 'username') {
          this.mensajeNombre = 'Nombre de usuario en uso.';
        }
        if (campo === 'email') {
          this.mensajeEmail = 'Error al cambiar el email.';
        }
      }
    );
  }

// Nueva función para cambiar la contraseña
  cambiarContrasena() {
    this.mensajePassword = '';

    if (this.passwordNueva !== this.confirmarPasswordNueva) {
      this.mensajePassword = 'Las contraseñas no coinciden.';
      return;
    }

    this.http.post(`http://localhost:5000/perfil/${this.usuarioAutenticado}/cambiar-contrasena`, {
      actual: this.passwordActual,
      nueva: this.passwordNueva
    }).subscribe((res: any) => {
      if (res.ok) {
        this.mensajePassword = 'Contraseña cambiada con éxito.';
        this.editPassword = false;
        this.passwordActual = '';
        this.passwordNueva = '';
        this.confirmarPasswordNueva = '';
      } else {
        this.mensajePassword =res.error;
      }
    }, (error) => {
      this.mensajePassword = 'Error al cambiar la contraseña.';
    });
  }
}
