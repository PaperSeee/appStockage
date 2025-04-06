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
    console.log('RegisterPage - ionViewWillEnter');
    
    // Check if user is already logged in
    const isLoggedIn = await this.firebaseService.isUserLoggedIn();
    if (isLoggedIn) {
      console.log('User already logged in, redirecting to main page');
      this.router.navigate(['/tabs/tab1']);
      return;
    }
    
    // Check for redirect result
    try {
      const user = await this.firebaseService.getRedirectResult();
      if (user) {
        console.log('Successfully signed in via redirect, user:', user.uid);
        
        // Check if user already exists in Firestore
        try {
          const userDoc = await this.firebaseService.getDocument('users', user.uid);
          
          if (!userDoc) {
            console.log('Creating new user document for:', user.uid);
            
            // Generate a unique username
            const baseUsername = (user.displayName || 'user').toLowerCase().replace(/[^a-z0-9]/g, '');
            const username = `${baseUsername}${Math.floor(Math.random() * 1000)}`;
            
            // Create new user document
            await this.firebaseService.setDocument('users', user.uid, {
              userId: user.uid,
              firstName: user.displayName?.split(' ')[0] || '',
              lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
              email: user.email,
              photo: user.photoURL,
              username: username,
              createdAt: new Date()
            });
          }
          
          console.log('Navigating to main page after auth');
          this.router.navigate(['/tabs/tab1']);
        } catch (dbError) {
          console.error('Error with Firestore:', dbError);
          this.showToast('Inscription réussie mais erreur de base de données');
          this.router.navigate(['/tabs/tab1']);
        }
      }
    } catch (error: unknown) {
      console.error('Error with redirect authentication:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      this.showToast('Erreur lors de l\'authentification: ' + errorMessage);
    }
  }

  async register() {
    try {
      if (!this.user.username.trim()) {
        alert('Le nom d\'utilisateur est obligatoire.');
        return;
      }

      let isAvailable = true;
      try {
        // Tentative de vérification du nom d'utilisateur
        isAvailable = await this.firebaseService.isUsernameAvailable(this.user.username);
      } catch (error) {
        console.warn('Erreur lors de la vérification du nom d\'utilisateur, on continue:', error);
        // On continue même si la vérification échoue
      }
      
      if (!isAvailable) {
        alert('Ce nom d\'utilisateur est déjà pris. Veuillez en choisir un autre.');
        return;
      }

      try {
        const userCredential = await this.firebaseService.signUp(this.user.email, this.user.password);
        const userId = userCredential.uid;

        // Try to save additional user data to Firestore
        try {
          // Use setDocument instead of addDocument to ensure document ID equals user UID
          await this.firebaseService.setDocument('users', userId, {
            userId,
            firstName: this.user.firstName,
            lastName: this.user.lastName,
            username: this.user.username,
            gender: this.user.gender,
            discipline: this.user.discipline,
            level: this.user.level,
            age: this.user.age,
            photo: this.user.photo,
            createdAt: new Date()
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
      
      const result = await this.firebaseService.signInWithApple();
      if (result) {
        // Check if user already exists in Firestore
        const userDoc = await this.firebaseService.getDocument('users', result.uid);
        
        if (!userDoc) {
          // Generate a unique username
          const baseUsername = (result.displayName || 'apple_user').toLowerCase().replace(/[^a-z0-9]/g, '');
          const username = `${baseUsername}${Math.floor(Math.random() * 1000)}`;
          
          // If user doesn't exist, create a new document
          await this.firebaseService.setDocument('users', result.uid, {
            userId: result.uid,
            firstName: result.displayName?.split(' ')[0] || '',
            lastName: result.displayName?.split(' ').slice(1).join(' ') || '',
            email: result.email,
            photo: result.photoURL,
            username: username,
            createdAt: new Date()
          });
        }
        
        this.router.navigate(['/tabs/tab1']);
      }
    } catch (error) {
      console.error('Error signing in with Apple:', error);
      this.showToast('La connexion avec Apple a échoué. Veuillez réessayer.');
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
