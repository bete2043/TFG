import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterModule, FormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  crear_cuenta=`¿Aún no tienes cuenta?`;
  error: string = '';
  
  constructor(private http: HttpClient, private router: Router) {}
  
  login(form: NgForm) {
    if (!form.valid) {
      this.error = 'Por favor, completa todos los campos.';
      return;
    }

    const { username, password } = form.value;

    // Enviar credenciales al backend
    this.http.post('http://localhost:5000/login', { username, password })
      .subscribe(
        (response: any) => {
          localStorage.setItem('usuario', username);
          this.error = ''; 
          this.router.navigate(['']);
        },
        (error) => {
          this.error = 'Usuario o contraseña incorrectos.'; 
        }
      );
  }
}
