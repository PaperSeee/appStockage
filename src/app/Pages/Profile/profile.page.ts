import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { FirebaseService } from '../../services/firebase.service';
import { Router } from '@angular/router';
import { ToastController, IonicModule, LoadingController } from '@ionic/angular';
import { CommonModule } from '@angular/common';

// Define interface for user data from Firestore
interface UserData {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  username?: string;
  photo?: string;
  discipline?: string;
  level?: string;
  weight?: any;
  phoneNumber?: string;
  lastUsernameChange?: any;
  [key: string]: any; // Allow any other properties
}

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
  canChangeUsername = false;
  nextUsernameChangeDate: Date | null = null;

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
      username: ['', Validators.required],
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
          // Use type assertion to properly type the userData
          const userData = await this.firebaseService.getDocument('users', this.userId) as UserData;
          if (userData) {
            this.profileForm.patchValue({
              firstName: userData.firstName || '',
              lastName: userData.lastName || '',
              email: userData.email || '',
              username: userData.username || '',
              photo: userData.photo || '',
              discipline: userData.discipline || '',
              level: userData.level || '',
              weight: userData.weight || ''
            });

            // Vérifier si l'utilisateur peut changer son nom d'utilisateur
            if (userData.lastUsernameChange) {
              const lastChange = userData.lastUsernameChange.toDate ? 
                userData.lastUsernameChange.toDate() : new Date(userData.lastUsernameChange);
              const oneWeekLater = new Date(lastChange);
              oneWeekLater.setDate(oneWeekLater.getDate() + 7);
              
              this.nextUsernameChangeDate = oneWeekLater;
              this.canChangeUsername = new Date() >= oneWeekLater;
              
              // Désactiver le champ username si nécessaire
              if (!this.canChangeUsername) {
                this.profileForm.get('username')?.disable();
              }
            } else {
              // Première utilisation, peut changer le nom d'utilisateur
              this.canChangeUsername = true;
            }

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
    if (!this.profileForm.valid) {
      this.showToast('Veuillez remplir correctement tous les champs requis');
      return;
    }

    this.isLoading = true;

    try {
      const formData = this.profileForm.getRawValue(); // Récupérer même les champs désactivés
      const usernameChanged = this.profileForm.enabled && 
                             this.profileForm.get('username')?.dirty && 
                             this.canChangeUsername;

      // Si le nom d'utilisateur a changé, vérifier sa disponibilité
      if (usernameChanged && this.userId) {
        const isAvailable = await this.firebaseService.isUsernameAvailable(formData.username, this.userId);
        if (!isAvailable) {
          this.showToast('Ce nom d\'utilisateur est déjà utilisé par quelqu\'un d\'autre', 'danger');
          this.isLoading = false;
          return;
        }

        // Mettre à jour la date de changement du nom d'utilisateur
        formData.lastUsernameChange = new Date();
      }

      if (this.userId) {
        // Préparer les données à enregistrer
        // Si une nouvelle image a été sélectionnée
        if (this.selectedFile) {
          // Ici, vous pourriez intégrer le code pour télécharger l'image sur Firebase Storage
          // et obtenir une URL
          formData.photo = this.selectedImage;
          // Exemple avec un service Firebase (à implémenter):
          // const photoURL = await this.firebaseService.uploadUserPhoto(this.userId, this.selectedFile);
          // formData.photo = photoURL;
        }

        await this.firebaseService.updateDocument('users', this.userId, formData);
        this.showToast('Profil mis à jour avec succès', 'success');
        this.profileForm.markAsPristine(); // Réinitialiser l'état sale après sauvegarde

        // Mettre à jour l'état de changement du nom d'utilisateur si nécessaire
        if (usernameChanged) {
          this.canChangeUsername = false;
          const nextChangeDate = new Date();
          nextChangeDate.setDate(nextChangeDate.getDate() + 7);
          this.nextUsernameChangeDate = nextChangeDate;
          this.profileForm.get('username')?.disable();
        }
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      this.showToast('Erreur lors de la mise à jour du profil', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  // Méthode pour formater la date au format local
  formatDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
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
      this.router.navigate(['/login']);
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