import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FirebaseService } from '../services/firebase.service';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule, RouterLink]
})
export class RegisterPage {
  user = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    gender: '',
    discipline: '',
    level: '',
    age: null as number | null,
    photo: null as string | null,
    username: '' // Assurez-vous que ce champ est bien initialisé
  };

  constructor(
    private firebaseService: FirebaseService,
    private router: Router,
    private toastController: ToastController
  ) {}
  
  async ionViewWillEnter() {
    // Check for auth redirect results
    const pendingAppleAuth = localStorage.getItem('pendingAppleAuth');
    const pendingGoogleAuth = localStorage.getItem('pendingGoogleAuth');
    
    if (pendingAppleAuth === 'true' || pendingGoogleAuth === 'true') {
      try {
        const user = await this.firebaseService.getRedirectResult();
        
        if (user) {
          // Clean up localStorage
          localStorage.removeItem('pendingAppleAuth');
          localStorage.removeItem('pendingGoogleAuth');
          localStorage.removeItem('authStartTime');
          
          // Navigate to main page
          this.router.navigate(['/tabs/tab1']);
        }
      } catch (error) {
        console.error('Authentication error:', error);
        
        // Clean up localStorage
        localStorage.removeItem('pendingAppleAuth');
        localStorage.removeItem('pendingGoogleAuth');
        localStorage.removeItem('authStartTime');
        
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        this.showToast('Erreur d\'authentification: ' + errorMessage);
      }
    }
  }

  async register() {
    try {
      // Validate basic required fields
      if (!this.user.firstName || !this.user.lastName || !this.user.email || !this.user.password) {
        this.showToast('Veuillez remplir tous les champs obligatoires');
        return;
      }
      
      // Username must be unique - generate one if needed
      if (!this.user.username) {
        // Create a username from email if not provided
        this.user.username = this.user.email.split('@')[0] + '_' + Math.floor(Math.random() * 1000);
      }
      
      // Check if username is available
      const isUsernameAvailable = await this.firebaseService.isUsernameAvailable(this.user.username);
      
      if (!isUsernameAvailable) {
        this.showToast('Ce nom d\'utilisateur est déjà pris. Veuillez en choisir un autre.');
        return;
      }
      
      try {
        // Create the authentication account
        const userCredential = await this.firebaseService.signUp(this.user.email, this.user.password);
        const user = userCredential;
        
        // Create the user document in Firestore
        try {
          await this.firebaseService.setDocument('users', user.uid, {
            userId: user.uid,
            firstName: this.user.firstName,
            lastName: this.user.lastName,
            email: this.user.email,
            username: this.user.username,
            gender: this.user.gender || '',
            discipline: this.user.discipline || '',
            level: this.user.level || '',
            age: this.user.age || null,
            photo: this.user.photo || null,
            createdAt: new Date(),
            settings: {
              notifications: true,
              darkMode: false
            }
          });
        } catch (firestoreError) {
          console.error('Erreur lors de l\'enregistrement du profil:', firestoreError);
          // We continue even if profile creation fails - the user is authenticated
        }

        // Navigate to the main page
        this.router.navigate(['/tabs/tab1']);
      } catch (authError) {
        console.error('Erreur lors de l\'authentification:', authError);
        // The firebaseService.signUp method already shows toasts for specific errors
      }
    } catch (error) {
      console.error('Erreur générale lors de l\'inscription:', error);
      alert('Une erreur s\'est produite lors de l\'inscription. Veuillez réessayer plus tard.');
    }
  }

  async signInWithGoogle() {
    try {
      // Add visual loading indicator
      const loading = await this.toastController.create({
        message: 'Redirection vers Google...',
        duration: 3000,
        position: 'bottom'
      });
      await loading.present();
      
      // Mark that authentication is in progress
      localStorage.setItem('pendingGoogleAuth', 'true');
      localStorage.setItem('authStartTime', Date.now().toString());
      
      // Trigger the redirect - won't return an immediate result
      await this.firebaseService.signInWithGoogle();
      
      // Note: After the redirect, the browser will leave this page
      // and return later to the same URL, where ionViewWillEnter will be called
    } catch (error: unknown) {
      // Clean up pending state in case of error
      localStorage.removeItem('pendingGoogleAuth');
      localStorage.removeItem('authStartTime');
      
      console.error('Google auth error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      this.showToast('La connexion avec Google a échoué: ' + errorMessage);
    }
  }

  async signInWithApple() {
    try {
      // Add visual loading indicator
      const loading = await this.toastController.create({
        message: 'Redirection vers Apple...',
        duration: 3000,
        position: 'bottom'
      });
      await loading.present();
      
      // Mark that authentication is in progress
      localStorage.setItem('pendingAppleAuth', 'true');
      localStorage.setItem('authStartTime', Date.now().toString());
      
      // Trigger the redirect - won't return an immediate result
      await this.firebaseService.signInWithApple();
      
      // Note: After the redirect, the browser will leave this page
      // and return later to the same URL, where ionViewWillEnter will be called
    } catch (error: unknown) {
      // Clean up pending state in case of error
      localStorage.removeItem('pendingAppleAuth');
      localStorage.removeItem('authStartTime');
      
      console.error('Apple auth error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      this.showToast('La connexion avec Apple a échoué: ' + errorMessage);
    }
  }
  
  async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color: 'danger'
    });
    await toast.present();
  }
}
