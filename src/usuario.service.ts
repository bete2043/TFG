import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class UsuarioService {
    private usuarioSubject = new BehaviorSubject<string | null>(localStorage.getItem('usuario'));
    usuario$ = this.usuarioSubject.asObservable();

    actualizarUsuario(nuevoUsuario: string) {
        localStorage.setItem('usuario', nuevoUsuario);
        this.usuarioSubject.next(nuevoUsuario);
    }
}
