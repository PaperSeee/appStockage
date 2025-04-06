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
      const currentUser = await this.firebaseService.getCurrentUser() as any;
      if (currentUser) {
        // Vérifier si l'utilisateur existe dans Firestore car la session peut être active
        // mais le document utilisateur pourrait ne pas avoir été créé
        this.ensureUserDocumentExists(currentUser);
      }
      this.router.navigate(['/tabs/tab1']);
      return;
    }
    
    // Vérifier si nous revenons d'une redirection d'authentification
    const pendingAppleAuth = localStorage.getItem('pendingAppleAuth');
    const pendingGoogleAuth = localStorage.getItem('pendingGoogleAuth');
    const authStartTime = localStorage.getItem('authStartTime');
    
    if (pendingAppleAuth === 'true' || pendingGoogleAuth === 'true') {
      console.log(`Pending auth detected, processing redirect result...`);
      
      try {
        const user = await this.firebaseService.getRedirectResult();
        console.log('Redirect result returned user:', user ? user.uid : 'null');
        
        if (user) {
          // Créer ou vérifier le document utilisateur
          await this.ensureUserDocumentExists(user);
          
          // Nettoyer les données de localStorage avant la redirection
          localStorage.removeItem('pendingAppleAuth');
          localStorage.removeItem('pendingGoogleAuth');
          localStorage.removeItem('authStartTime');
          
          console.log('Navigating to main page after auth');
          this.router.navigate(['/tabs/tab1']);
        } else {
          // Si on n'a pas eu de résultat mais qu'il y a une authentification en attente
          console.log('No redirect result yet, checking current user status...');
          
          // Attendre un peu puis vérifier explicitement l'utilisateur actuel
          setTimeout(async () => {
            const isLoggedIn = await this.firebaseService.isUserLoggedIn();
            const currentUser = await this.firebaseService.getCurrentUser() as any;
            
            if (isLoggedIn && currentUser) {
              console.log('User is logged in after delay check:', currentUser.uid);
              
              // Vérifier et créer le document utilisateur si nécessaire
              await this.ensureUserDocumentExists(currentUser);
              
              // Nettoyer les données de localStorage
              localStorage.removeItem('pendingAppleAuth');
              localStorage.removeItem('pendingGoogleAuth');
              localStorage.removeItem('authStartTime');
              
              this.router.navigate(['/tabs/tab1']);
            } else {
              console.log('No user found after delay, auth may have failed');
              
              // Nettoyer les données de localStorage après échec
              localStorage.removeItem('pendingAppleAuth');
              localStorage.removeItem('pendingGoogleAuth');
              localStorage.removeItem('authStartTime');
              
              // Afficher un message d'erreur uniquement si l'auth était récente (moins de 5 minutes)
              if (authStartTime && (Date.now() - parseInt(authStartTime)) < 300000) {
                this.showToast('L\'authentification a échoué. Veuillez réessayer.');
              }
            }
          }, 2000);
        }
      } catch (error: unknown) {
        console.error('Error with redirect authentication:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        this.showToast('Erreur lors de l\'authentification: ' + errorMessage);
        
        // Nettoyer l'état en attente en cas d'erreur
        localStorage.removeItem('pendingAppleAuth');
        localStorage.removeItem('pendingGoogleAuth');
        localStorage.removeItem('authStartTime');
      }
    } else {
      // Comportement normal - vérifier si l'utilisateur est déjà connecté
      if (isLoggedIn) {
        console.log('User already logged in, redirecting to main page');
        this.router.navigate(['/tabs/tab1']);
      }
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

  // Nouvelle méthode pour assurer que le document utilisateur existe
  private async ensureUserDocumentExists(user: any) {
    console.log('Ensuring user document exists for:', user.uid);
    try {
      // Vérifier si l'utilisateur existe déjà dans Firestore
      const userDoc = await this.firebaseService.getDocument('users', user.uid);
      
      if (!userDoc) {
        console.log('User document not found, creating new one for:', user.uid);
        
        // Générer un nom d'utilisateur unique basé sur l'email ou le nom d'affichage
        let username = '';
        if (user.email) {
          username = user.email.split('@')[0];
        } else if (user.displayName) {
          username = user.displayName.toLowerCase().replace(/\s+/g, '');
        } else {
          username = `user_${Math.floor(Math.random() * 10000)}`;
        }
        
        // Créer un nouveau document utilisateur avec setDocument pour utiliser l'UID comme ID
        await this.firebaseService.setDocument('users', user.uid, {
          userId: user.uid,
          firstName: user.displayName?.split(' ')[0] || '',
          lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
          email: user.email || '',
          username: username,
          photo: user.photoURL || '',
          createdAt: new Date()
        });
        
        console.log('User document successfully created for:', user.uid);
      } else {
        console.log('User document already exists for:', user.uid);
      }
    } catch (dbError) {
      console.error('Error ensuring user document exists:', dbError);
      this.showToast('Erreur lors de la création du profil utilisateur');
      throw dbError;
    }
  }
}
