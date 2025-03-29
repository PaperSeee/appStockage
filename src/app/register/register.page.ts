import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FirebaseService } from '../services/firebase.service';
import { Router, RouterLink } from '@angular/router'; // Ajout de RouterLink

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule, RouterLink] // Ajout de RouterLink
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
    age: null,
    photo: null
  };

  constructor(
    private firebaseService: FirebaseService,
    private router: Router // Injection du service Router
  ) {}

  async register() {
    try {
      const userCredential = await this.firebaseService.signUp(this.user.email, this.user.password);
      const userId = userCredential.uid;

      // Save additional user data to Firestore
      await this.firebaseService.addDocument('users', {
        userId,
        firstName: this.user.firstName,
        lastName: this.user.lastName,
        gender: this.user.gender,
        discipline: this.user.discipline,
        level: this.user.level,
        age: this.user.age,
        photo: this.user.photo
      });

      alert('Compte créé avec succès!');
      
      // Redirection vers tab1 après l'inscription réussie
      this.router.navigate(['/tabs/tab1']);
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      alert('L\'inscription a échoué. Veuillez réessayer.');
    }
  }

  async signInWithGoogle() {
    try {
      const result = await this.firebaseService.signInWithGoogle();
      if (result) {
        try {
          // Vérifier si l'utilisateur existe déjà dans Firestore
          const userDoc = await this.firebaseService.getDocument('users', result.uid);
          
          if (!userDoc) {
            // Si l'utilisateur n'existe pas, créer un nouveau document
            try {
              await this.firebaseService.addDocument('users', {
                userId: result.uid,
                firstName: result.displayName?.split(' ')[0] || '',
                lastName: result.displayName?.split(' ').slice(1).join(' ') || '',
                email: result.email,
                photo: result.photoURL,
                createdAt: new Date()
              });
              console.log('Nouveau profil utilisateur créé avec succès');
            } catch (docError) {
              console.error('Erreur lors de la création du profil:', docError);
              // On continue la navigation même si la création de profil échoue
              // L'utilisateur pourra compléter son profil plus tard
            }
          }
          
          // Continuer avec la navigation même en cas d'erreur de profil
          this.router.navigate(['/tabs/tab1']);
        } catch (firestoreError) {
          console.error('Erreur de Firestore:', firestoreError);
          // Afficher un message mais continuer quand même
          alert('Connexion réussie, mais impossible de charger votre profil. Certaines fonctionnalités peuvent être limitées.');
          this.router.navigate(['/tabs/tab1']);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la connexion avec Google:', error);
      
      // Messages d'erreur plus spécifiques
      if ((error as { code: string }).code === 'permission-denied') {
        alert('Problème d\'accès à la base de données. Veuillez contacter l\'administrateur.');
      } else {
        alert('La connexion avec Google a échoué. Veuillez réessayer.');
      }
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
      alert('La connexion avec Apple a échoué. Veuillez réessayer.');
    }
  }
}
