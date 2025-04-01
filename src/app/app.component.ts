import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FirebaseService } from './services/firebase.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false
})
export class AppComponent implements OnInit {
  constructor(private router: Router, private firebaseService: FirebaseService) {}

  async ngOnInit() {
    console.log('AppComponent - Initializing');
    
    // Vérifier si l'utilisateur est déjà connecté
    const isLoggedIn = await this.firebaseService.isUserLoggedIn();
    console.log('User logged in status:', isLoggedIn);
    
    if (isLoggedIn) {
      console.log('User already logged in, redirecting to main page');
      this.router.navigate(['/tabs/tab1']);
      return;
    }
    
    // Vérifier le résultat de redirection uniquement si nécessaire
    const pendingAuth = localStorage.getItem('pendingGoogleAuth');
    if (pendingAuth === 'true') {
      try {
        console.log('Checking auth redirection in AppComponent');
        const user = await this.firebaseService.getRedirectResult();
        if (user) {
          console.log('Successfully signed in via redirect in AppComponent');
          this.router.navigate(['/tabs/tab1']);
        }
      } catch (error) {
        console.error('Error with redirect sign-in in AppComponent:', error);
      }
    }
  }
}
