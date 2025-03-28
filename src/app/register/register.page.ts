import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FirebaseService } from '../services/firebase.service';
import { Router } from '@angular/router'; // Import du service Router

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule] // Ajout des modules nécessaires
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

      alert('Account created successfully!');
      
      // Redirection vers tab1 après l'inscription réussie
      this.router.navigate(['/tabs/tab1']);
    } catch (error) {
      console.error('Error during registration:', error);
      alert('Registration failed. Please try again.');
    }
  }
}
