import { Component, OnInit } from '@angular/core';
import { IonicModule, ModalController, ToastController, ActionSheetController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirebaseService } from '../../../services/firebase.service';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

// Define interface for user data returned from Firebase
interface UserData {
  id?: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  photo?: string;
  discipline?: string;
  [key: string]: any; // Allow for other properties
}

@Component({
  selector: 'app-post-creator',
  templateUrl: './post-creator.component.html',
  styleUrls: ['./post-creator.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class PostCreatorComponent implements OnInit {
  currentUser: any;
  post = {
    content: '',
    type: '',
    media: [] as any[],
    tags: [] as string[]
  };
  
  availableTypes = [
    { value: 'training', label: 'Entraînement' },
    { value: 'competition', label: 'Compétition' },
    { value: 'technique', label: 'Technique' },
    { value: 'question', label: 'Question' }
  ];
  
  // Nouvelle propriété pour gérer l'affichage du sélecteur de type
  showingTypeSelector = false;
  
  constructor(
    private modalController: ModalController,
    private firebaseService: FirebaseService,
    private toastController: ToastController,
    private actionSheetController: ActionSheetController
  ) {}

  async ngOnInit() {
    try {
      const user = await this.firebaseService.getCurrentUser() as any;
      if (user && user.uid) {
        // Use type assertion to properly type the userData
        const userData = await this.firebaseService.getDocument('users', user.uid) as UserData;
        
        this.currentUser = {
          id: user.uid,
          name: `${userData?.firstName || ''} ${userData?.lastName || ''}`,
          avatar: userData?.photo || 'assets/default-avatar.png',
          discipline: userData?.discipline
        };
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  }
  
  async addPhoto() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Ajouter une photo',
      buttons: [
        {
          text: 'Prendre une photo',
          icon: 'camera',
          handler: () => {
            // Enable now that Camera is installed
            this.captureImage(CameraSource.Camera);
          }
        },
        {
          text: 'Choisir dans la galerie',
          icon: 'image',
          handler: () => {
            // Enable now that Camera is installed
            this.captureImage(CameraSource.Photos);
          }
        },
        {
          text: 'Annuler',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    
    await actionSheet.present();
  }
  
  async captureImage(source: CameraSource) {
    try {
      // First, check and request permissions
      const permissionStatus = await Camera.checkPermissions();
      if (permissionStatus.camera !== 'granted' || permissionStatus.photos !== 'granted') {
        await Camera.requestPermissions();
      }
      
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: source
      });
      
      if (image && image.dataUrl) {
        this.post.media.push({
          type: 'image',
          url: image.dataUrl
        });
        
        const toast = await this.toastController.create({
          message: 'Photo ajoutée avec succès',
          duration: 2000
        });
        await toast.present();
      }
    } catch (error) {
      console.error('Error capturing image:', error);
      const toast = await this.toastController.create({
        message: 'Erreur lors de la prise de photo',
        duration: 2000
      });
      await toast.present();
    }
  }
  
  removeMedia(index: number) {
    this.post.media.splice(index, 1);
  }
  
  extractHashtags() {
    const hashtagRegex = /#(\w+)/g;
    const matches = this.post.content.match(hashtagRegex);
    if (matches) {
      this.post.tags = matches.map(tag => tag.substring(1));
    } else {
      this.post.tags = [];
    }
  }
  
  async submitPost() {
    if (!this.post.content.trim() && this.post.media.length === 0) {
      const toast = await this.toastController.create({
        message: 'Veuillez ajouter du contenu ou une image à votre publication',
        duration: 2000
      });
      await toast.present();
      return;
    }
    
    this.extractHashtags();
    
    this.modalController.dismiss({
      post: this.post,
      submitted: true
    });
  }
  
  cancel() {
    this.modalController.dismiss({
      submitted: false
    });
  }
  
  // Obtenir le libellé du type sélectionné
  getTypeLabel(typeValue: string): string {
    const type = this.availableTypes.find(t => t.value === typeValue);
    return type ? type.label : '';
  }
  
  // Afficher/masquer le sélecteur de type
  showTypeSelector() {
    this.showingTypeSelector = !this.showingTypeSelector;
  }
  
  // Sélectionner un type et fermer le sélecteur
  selectType(typeValue: string) {
    this.post.type = typeValue;
    this.showingTypeSelector = false;
  }
}
