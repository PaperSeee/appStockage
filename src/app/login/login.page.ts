import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FirebaseService } from '../services/firebase.service';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule, RouterLink]
})
export class LoginPage {
  user = {
    email: '',
    password: ''
  };

  constructor(
    private firebaseService: FirebaseService,
    private router: Router,
    private toastController: ToastController
  ) {}

  async ionViewWillEnter() {
    console.log('LoginPage - ionViewWillEnter');
    
    // Vérifier d'abord si l'utilisateur est déjà connecté
    const isLoggedIn = await this.firebaseService.isUserLoggedIn();
    if (isLoggedIn) {
      console.log('User already logged in, redirecting to main page');
      this.router.navigate(['/tabs/tab1']);
      return;
    }
    
    // Ensuite, vérifier si nous revenons d'une redirection d'authentification
    try {
      const user = await this.firebaseService.getRedirectResult();
      if (user) {
        console.log('Successfully signed in via redirect, user:', user.uid);
        
        // Vérifier si l'utilisateur existe déjà dans Firestore
        try {
          const userDoc = await this.firebaseService.getDocument('users', user.uid);
          
          if (!userDoc) {
            console.log('Creating new user document for:', user.uid);
            // Créer un nouveau document utilisateur
            await this.firebaseService.addDocument('users', {
              userId: user.uid,
              firstName: user.displayName?.split(' ')[0] || '',
              lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
              email: user.email,
              photo: user.photoURL,
              createdAt: new Date()
            });
          }
          
          console.log('Navigating to main page after auth');
          this.router.navigate(['/tabs/tab1']);
        } catch (dbError) {
          console.error('Error with Firestore:', dbError);
          this.showToast('Connexion réussie mais erreur de base de données');
          this.router.navigate(['/tabs/tab1']);
        }
      } else {
        // Vérifier si l'authentification est en attente (Google ou Apple)
        const pendingGoogleAuth = localStorage.getItem('pendingGoogleAuth');
        const pendingAppleAuth = localStorage.getItem('pendingAppleAuth');
        
        if (pendingGoogleAuth === 'true' || pendingAppleAuth === 'true') {
          console.log(`Pending ${pendingGoogleAuth === 'true' ? 'Google' : 'Apple'} auth detected, checking auth state...`);
          
          // Attendre un peu plus longtemps pour s'assurer que l'authentification est traitée
          setTimeout(async () => {
            const delayed = await this.firebaseService.isUserLoggedIn();
            if (delayed) {
              console.log('Delayed auth check successful');
              this.router.navigate(['/tabs/tab1']);
            } else {
              // Nettoyer l'état en attente si l'authentification a échoué
              localStorage.removeItem('pendingGoogleAuth');
              localStorage.removeItem('pendingAppleAuth');
              localStorage.removeItem('authStartTime');
            }
          }, 2000); // Augmenter le délai pour donner plus de temps
        }
      }
    } catch (error: unknown) {
      console.error('Error with redirect authentication:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      this.showToast('Erreur lors de l\'authentification: ' + errorMessage);
      
      // Nettoyer l'état en attente en cas d'erreur
      localStorage.removeItem('pendingGoogleAuth');
      localStorage.removeItem('pendingAppleAuth');
      localStorage.removeItem('authStartTime');
    }
  }

  async login() {
    try {
      await this.firebaseService.signIn(this.user.email, this.user.password);
      this.router.navigate(['/tabs/tab1']);
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      this.showToast('Email ou mot de passe incorrect');
    }
  }

  async signInWithGoogle() {
    try {
      // Ajouter un indicateur visuel de chargement
      const loading = await this.toastController.create({
        message: 'Redirection vers Google...',
        duration: 3000,
        position: 'bottom'
      });
      await loading.present();
      
      // Marquer qu'une authentification est en cours
      localStorage.setItem('pendingGoogleAuth', 'true');
      localStorage.setItem('authStartTime', Date.now().toString());
      
      // Déclencher la redirection - ne retourne pas de résultat immédiat
      await this.firebaseService.signInWithGoogle();
      
      // Note: Après la redirection, le navigateur quittera cette page
      // et reviendra plus tard sur la même URL, où ionViewWillEnter sera appelé
    } catch (error: unknown) {
      // Nettoyer l'état en attente en cas d'erreur
      localStorage.removeItem('pendingGoogleAuth');
      localStorage.removeItem('authStartTime');
      
      console.error('Google auth error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      this.showToast('La connexion avec Google a échoué: ' + errorMessage);
    }
  }

  async signInWithApple() {
    try {
      // Ajouter un indicateur visuel de chargement
      const loading = await this.toastController.create({
        message: 'Redirection vers Apple...',
        duration: 3000,
        position: 'bottom'
      });
      await loading.present();
      
      // Marquer qu'une authentification est en cours
      localStorage.setItem('pendingAppleAuth', 'true');
      localStorage.setItem('authStartTime', Date.now().toString());
      
      // Déclencher la redirection - ne retourne pas de résultat immédiat
      await this.firebaseService.signInWithApple();
      
      // Note: Après la redirection, le navigateur quittera cette page
      // et reviendra plus tard sur la même URL, où ionViewWillEnter sera appelé
    } catch (error: unknown) {
      // Nettoyer l'état en attente en cas d'erreur
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
      duration: 2000,
      position: 'bottom',
      color: 'danger'
    });
    toast.present();
  }
}
