import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-crear-cuenta',
  standalone: true,
  imports: [RouterModule, FormsModule, CommonModule],
  templateUrl: './crear-cuenta.component.html',
  styleUrl: './crear-cuenta.component.css'
})
export class CrearCuentaComponent {
  inicar_sesion = "¿Ya tienes cuenta?"
  errorUsuario: string = '';
  errorSocio: string = '';
  errorPassword: string = '';
  mensajeExito: string = '';
  errorCampos: string = ''; 

  constructor(private http: HttpClient, private router: Router) {}
  crearCuenta(form: NgForm) {

    const userData = {
        username: form.value.username,
        member: form.value.member,
        email: form.value.email,
        password: form.value.password,
        confirm_password: form.value.confirm_password
      };

      this.errorUsuario = '';
      this.errorSocio = '';
      this.errorPassword = '';
      this.errorCampos = '';
      this.mensajeExito = '';

      // Enviar los datos al backend para registrar la cuenta
      this.http.post('http://localhost:5000/crear_cuenta', userData)
        .subscribe(
          (response: any) => {
            this.mensajeExito = 'Usuario creado correctamente.';
            this.errorUsuario = '';
            this.errorSocio = '';
            this.errorPassword = '';
            this.errorCampos = '';
            form.reset();
          },
          (error) => {
            console.log(error);
            if (error.error?.error === 'Usuario ya registrado') {
              this.errorUsuario = 'El usuario ya existe.';
            } else if (error.error?.error === 'Número de socio ya registrado') {
              this.errorSocio = 'El número de socio ya existe.';
            } else if (error.error?.error === 'Las contraseñas no coinciden'){
              this.errorPassword = 'La contraseña no coincide.';
            } else if (error.error?.error === 'Faltan datos'){
              this.errorCampos = 'Por favor, completa todos los campos.';
            } else {
              this.errorCampos = 'Error al crear la cuenta.';
            }
          }
        );
    }
}


