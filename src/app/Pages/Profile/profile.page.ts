import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { FirebaseService } from '../../services/firebase.service';
import { Router } from '@angular/router';
import { ToastController, IonicModule, LoadingController } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [IonicModule, FormsModule, ReactiveFormsModule, CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ProfilePage implements OnInit {
  profileForm: FormGroup;
  userId: string | null = null;
  selectedImage: string | null = null;
  selectedFile: File | null = null;
  isLoading = false;

  constructor(
    private formBuilder: FormBuilder,
    private firebaseService: FirebaseService,
    private router: Router,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {
    this.profileForm = this.formBuilder.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      photo: [''],
      discipline: [''],
      level: [''],
      weight: ['', [Validators.min(30), Validators.max(200)]]
    });
  }

  async ngOnInit() {
    const loading = await this.loadingController.create({
      message: 'Chargement du profil...',
      spinner: 'circular'
    });
    
    await loading.present();
    
    try {
      const user = await this.firebaseService.getCurrentUser() as { uid: string } | null;
      if (user) {
        this.userId = user.uid;
        if (this.userId) {
          const userData = await this.firebaseService.getDocument('users', this.userId);
          if (userData) {
            this.profileForm.patchValue(userData);
            // Réinitialiser l'état sale du formulaire après le chargement
            this.profileForm.markAsPristine();
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
      this.showToast('Erreur lors du chargement du profil', 'danger');
    } finally {
      loading.dismiss();
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedFile = file;
      
      // Créer une URL pour prévisualiser l'image
      const reader = new FileReader();
      reader.onload = () => {
        this.selectedImage = reader.result as string;
        this.profileForm.markAsDirty(); // Marquer le formulaire comme modifié
      };
      reader.readAsDataURL(file);
    }
  }

  async saveProfile() {
    if (this.profileForm.valid && this.userId) {
      const loading = await this.loadingController.create({
        message: 'Enregistrement en cours...',
        spinner: 'circular'
      });
      
      await loading.present();
      
      try {
        // Préparer les données à enregistrer
        const userData = this.profileForm.value;
        
        // Si une nouvelle image a été sélectionnée
        if (this.selectedFile) {
          // Dans un cas réel, vous téléchargeriez le fichier sur Firebase Storage
          // et obtiendriez une URL
          userData.photo = this.selectedImage;
          
          // Exemple avec un service Firebase (à implémenter):
          // const photoURL = await this.firebaseService.uploadUserPhoto(this.userId, this.selectedFile);
          // userData.photo = photoURL;
        }
        
        await this.firebaseService.updateDocument('users', this.userId, userData);
        this.profileForm.markAsPristine(); // Réinitialiser l'état sale après sauvegarde
        this.showToast('Profil mis à jour avec succès', 'success');
      } catch (error) {
        console.error('Erreur lors de la mise à jour du profil:', error);
        this.showToast('Erreur lors de la mise à jour du profil', 'danger');
      } finally {
        loading.dismiss();
      }
    }
  }

  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom',
      buttons: [
        {
          text: 'OK',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }

  async logout() {
    const loading = await this.loadingController.create({
      message: 'Déconnexion...',
      spinner: 'circular'
    });
    
    await loading.present();
    
    try {
      await this.firebaseService.logout();
      this.router.navigate(['/register']);
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      this.showToast('Erreur lors de la déconnexion', 'danger');
    } finally {
      loading.dismiss();
    }
  }

  goToTab1() {
    this.router.navigate(['/tabs/tab1']);
  }
}
