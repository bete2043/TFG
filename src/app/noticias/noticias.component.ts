import { Component, HostListener, ChangeDetectorRef } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-noticias',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './noticias.component.html',
  styleUrl: './noticias.component.css'
})
export class NoticiasComponent {
  info: any[] = [];
  currentRoute: string = '';

  constructor(private http: HttpClient, private router: Router, private cdRef: ChangeDetectorRef) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentRoute = event.urlAfterRedirects;
      const rutaActual = this.router.url;
      
      this.cdRef.detectChanges();
    });
  }
  
  ngOnInit() {
    
    this.http.get<any[]>('http://localhost:5000/').subscribe(
      (response) => {
        this.info = response;
      },
      (error) => {
        console.error('Error al obtener los datos', error);       
      }
    );
  }
}
