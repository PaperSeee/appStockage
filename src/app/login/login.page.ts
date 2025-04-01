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
    // Check for redirect result when page loads
    try {
      const user = await this.firebaseService.getRedirectResult();
      if (user) {
        console.log('Successfully signed in via redirect');
        // Handle successful sign-in via redirect
        this.router.navigate(['/tabs/tab1']);
      }
    } catch (error) {
      console.error('Error with redirect sign-in:', error);
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
      const result = await this.firebaseService.signInWithGoogle();
      if (result) {
        // Vérifier si l'utilisateur existe déjà dans Firestore
        const userDoc = await this.firebaseService.getDocument('users', result.uid);
        
        if (!userDoc) {
          // Si l'utilisateur n'existe pas, créer un nouveau document
          await this.firebaseService.addDocument('users', {
            userId: result.uid,
            firstName: result.displayName?.split(' ')[0] || '',
            lastName: result.displayName?.split(' ').slice(1).join(' ') || '',
            email: result.email,
            photo: result.photoURL
          });
        }
        
        this.router.navigate(['/tabs/tab1']);
      }
    } catch (error) {
      console.error('Erreur lors de la connexion avec Google:', error);
      this.showToast('La connexion avec Google a échoué');
    }
  }

  async loginWithGoogle() {
    try {
      const user = await this.firebaseService.signInWithGoogle();
      
      // Only navigate if we got a user (not redirected)
      if (user) {
        this.router.navigate(['/tabs/tab1']);
      }
      // If redirected, the ionViewWillEnter will handle the result
    } catch (error: any) {
      console.error('Erreur lors de la connexion avec Google:', error);
      
      // Show user-friendly error message
      const errorMessage = error.message || 'La connexion a échoué. Veuillez réessayer plus tard.';
      const toast = await this.toastController.create({
        message: errorMessage,
        duration: 3000,
        position: 'bottom',
        color: 'danger'
      });
      toast.present();
    }
  }

  async signInWithApple() {
    try {
      const result = await this.firebaseService.signInWithApple();
      if (result) {
        // Vérifier si l'utilisateur existe déjà dans Firestore
        const userDoc = await this.firebaseService.getDocument('users', result.uid);
        
        if (!userDoc) {
          // Si l'utilisateur n'existe pas, créer un nouveau document
          await this.firebaseService.addDocument('users', {
            userId: result.uid,
            firstName: result.displayName?.split(' ')[0] || '',
            lastName: result.displayName?.split(' ').slice(1).join(' ') || '',
            email: result.email,
            photo: result.photoURL
          });
        }
        
        this.router.navigate(['/tabs/tab1']);
      }
    } catch (error) {
      console.error('Erreur lors de la connexion avec Apple:', error);
      this.showToast('La connexion avec Apple a échoué');
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
