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
            try {
              console.log('Création d\'un nouveau profil utilisateur pour:', result.uid);
              // Attendre 1 seconde pour s'assurer que l'authentification est bien propagée
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // Utiliser setDocument au lieu de addDocument pour définir l'ID explicitement
              await this.firebaseService.setDocument('users', result.uid, {
                userId: result.uid,
                firstName: result.displayName?.split(' ')[0] || '',
                lastName: result.displayName?.split(' ').slice(1).join(' ') || '',
                email: result.email,
                photo: result.photoURL,
                createdAt: new Date()
              });
              console.log('Profil utilisateur créé avec succès');
            } catch (docError) {
              console.error('Erreur lors de la création du profil:', docError);
              // Continuer malgré l'erreur
            }
          }
          
          this.router.navigate(['/tabs/tab1']);
        } catch (firestoreError) {
          console.error('Erreur Firestore:', firestoreError);
          // Navigation simplifiée en cas d'erreur
          this.router.navigate(['/tabs/tab1']);
        }
      }
    } catch (error) {
      console.error('Erreur d\'authentification Google:', error);
      alert('La connexion a échoué. Veuillez réessayer plus tard.');
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
