import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { FirebaseService } from '../../services/firebase.service';
import { Router } from '@angular/router';
import { ToastController, IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [IonicModule, FormsModule, ReactiveFormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ProfilePage implements OnInit {
  profileForm: FormGroup;
  userId: string | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private firebaseService: FirebaseService,
    private router: Router,
    private toastController: ToastController
  ) {
    this.profileForm = this.formBuilder.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      photo: [''],
    });
  }

  async ngOnInit() {
    const user = await this.firebaseService.getCurrentUser() as { uid: string } | null;
    if (user) {
      this.userId = user.uid;
      if (this.userId) {
        const userData = await this.firebaseService.getDocument('users', this.userId);
        if (userData) {
          this.profileForm.patchValue(userData);
        }
      }
    }
  }

  async saveProfile() {
    if (this.profileForm.valid && this.userId) {
      try {
        await this.firebaseService.updateDocument('users', this.userId, this.profileForm.value);
        const toast = await this.toastController.create({
          message: 'Profil mis à jour avec succès.',
          duration: 2000,
          color: 'success',
        });
        await toast.present();
      } catch (error) {
        console.error('Error updating profile:', error);
      }
    }
  }

  async logout() {
    await this.firebaseService.logout();
    this.router.navigate(['/register']);
  }
}
