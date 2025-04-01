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

// Define Firebase user type
interface FirebaseUser {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
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
  isLoading = true; // Start with loading state
  canChangeUsername = false;
  nextUsernameChangeDate: Date | null = null;
  userDataLoaded = false; // Flag to track if user data was loaded

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
      phoneNumber: [''],
      discipline: [''],
      level: [''],
      weight: ['', [Validators.min(30), Validators.max(200)]]
    });
  }

  async ngOnInit() {
    this.isLoading = true;
    
    try {
      // Get the current authenticated user with proper type casting
      const user = await this.firebaseService.getCurrentUser() as FirebaseUser | null;
      console.log("Current user:", user);
      
      if (user && user.uid) {
        this.userId = user.uid;
        console.log("User ID:", this.userId);
        
        if (this.userId) {
          // Debug: Log before getting the document
          console.log("Fetching user document from Firestore for ID:", this.userId);
          
          try {
            // Get user data from Firestore with explicit type casting
            let userData = await this.firebaseService.getDocument('users', this.userId) as UserData;
            console.log("Raw user data from Firestore:", userData);
            
            // If user document doesn't exist, create it with basic info
            if (!userData) {
              console.log("Creating new user document in Firestore");
              
              // Extract name parts from display name if available
              let firstName = '', lastName = '';
              if (user.displayName) {
                const nameParts = user.displayName.split(' ');
                firstName = nameParts[0] || '';
                lastName = nameParts.slice(1).join(' ') || '';
              }

              // Generate a username from email or uid
              const username = user.email ? 
                user.email.split('@')[0] : 
                `user_${Math.floor(Math.random() * 10000)}`;
              
              const newUserData: UserData = {
                userId: user.uid,
                firstName: firstName,
                lastName: lastName,
                email: user.email || '',
                username: username,
                photo: user.photoURL || '',
                createdAt: new Date()
              };
              
              // Add the document to Firestore
              await this.firebaseService.setDocument('users', this.userId, newUserData);
              console.log("Created new user document:", newUserData);
              
              // Use the new data
              userData = await this.firebaseService.getDocument('users', this.userId) as UserData;
            }
            
            if (userData) {
              this.userDataLoaded = true;
              
              // Create a clean data object with optional chaining
              const formData = {
                firstName: userData?.firstName || '',
                lastName: userData?.lastName || '',
                email: userData?.email || '',
                username: userData?.username || '',
                photo: userData?.photo || '',
                phoneNumber: userData?.phoneNumber || '',
                discipline: userData?.discipline || '',
                level: userData?.level || '',
                weight: userData?.weight || ''
              };
              
              console.log("Processed data to patch form:", formData);
              
              // Reset form first to ensure clean state
              this.profileForm.reset();
              
              // Update the form with the user data
              this.profileForm.patchValue(formData);
              
              // Verify form values were updated
              console.log("Form values after patch:", this.profileForm.value);

              // Check username change ability
              if (userData?.lastUsernameChange) {
                const lastChange = userData.lastUsernameChange.toDate ? 
                  userData.lastUsernameChange.toDate() : new Date(userData.lastUsernameChange);
                const oneWeekLater = new Date(lastChange);
                oneWeekLater.setDate(oneWeekLater.getDate() + 7);
                
                this.nextUsernameChangeDate = oneWeekLater;
                this.canChangeUsername = new Date() >= oneWeekLater;
                
                if (!this.canChangeUsername) {
                  this.profileForm.get('username')?.disable();
                }
              } else {
                this.canChangeUsername = true;
              }

              // Reset form dirty state
              this.profileForm.markAsPristine();
            } else {
              console.error("Failed to create or retrieve user document");
              this.showToast('Erreur lors de la création du profil', 'danger');
            }
          } catch (docError) {
            console.error("Error fetching user document:", docError);
            this.showToast('Erreur lors du chargement des données utilisateur', 'danger');
          }
        }
      } else {
        console.log("No authenticated user found");
        this.showToast('Vous devez être connecté pour accéder à votre profil', 'warning');
        this.router.navigate(['/login']);
      }
    } catch (error) {
      console.error('Error in profile initialization:', error);
      this.showToast('Erreur lors du chargement du profil', 'danger');
    } finally {
      this.isLoading = false;
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
    if (!date) return '';
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