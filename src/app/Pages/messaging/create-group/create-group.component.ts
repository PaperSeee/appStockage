import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirebaseService } from '../../../services/firebase.service';
import { MessagingService, UserDocument } from '../../../services/messaging.service';

@Component({
  selector: 'app-create-group',
  templateUrl: './create-group.component.html',
  styleUrls: ['./create-group.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class CreateGroupComponent implements OnInit {
  users: UserDocument[] = [];
  filteredUsers: UserDocument[] = [];
  selectedUsers: UserDocument[] = [];
  searchTerm: string = '';
  groupName: string = '';
  groupPhoto: string = '';
  loading = true;
  creatingGroup = false;
  currentUserId: string | null = null;
  
  defaultGroupPhoto = 'assets/default-group.png'; // Default group avatar

  constructor(
    private router: Router,
    private firebaseService: FirebaseService,
    private messagingService: MessagingService,
    private toastController: ToastController
  ) {}

  async ngOnInit() {
    this.loading = true;
    
    try {
      const user = await this.firebaseService.getCurrentUser() as any;
      this.currentUserId = user ? user.uid : null;
      
      if (this.currentUserId) {
        // Get all users except current user
        const usersData = await this.firebaseService.getAllDocuments('users') as UserDocument[];
        this.users = usersData.filter(user => user.id !== this.currentUserId);
        this.filteredUsers = [...this.users];
      }
    } catch (error) {
      console.error('Error loading users:', error);
      this.showToast('Erreur lors du chargement des utilisateurs', 'danger');
    } finally {
      this.loading = false;
    }
  }

  filterUsers() {
    const term = this.searchTerm.toLowerCase().trim();
    
    if (!term) {
      this.filteredUsers = this.users.filter(user => 
        !this.selectedUsers.some(selectedUser => selectedUser.id === user.id)
      );
      return;
    }
    
    this.filteredUsers = this.users.filter(user => 
      !this.selectedUsers.some(selectedUser => selectedUser.id === user.id) &&
      ((user.firstName && user.firstName.toLowerCase().includes(term)) ||
      (user.lastName && user.lastName.toLowerCase().includes(term)) ||
      (user.discipline && user.discipline.toLowerCase().includes(term)))
    );
  }

  selectUser(user: UserDocument) {
    this.selectedUsers.push(user);
    this.filterUsers(); // Re-filter to remove selected user from the list
    this.searchTerm = '';
  }

  removeSelectedUser(index: number) {
    this.selectedUsers.splice(index, 1);
    this.filterUsers(); // Re-filter to add removed user back to the list
  }

  getUserFullName(user: UserDocument): string {
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Utilisateur';
  }

  async createGroup() {
    if (this.selectedUsers.length === 0) {
      this.showToast('Veuillez sélectionner au moins un participant', 'warning');
      return;
    }
    
    if (!this.groupName.trim()) {
      this.showToast('Veuillez saisir un nom pour le groupe', 'warning');
      return;
    }
    
    this.creatingGroup = true;
    
    try {
      const participantIds = this.selectedUsers.map(user => user.id);
      const conversationId = await this.messagingService.createGroupConversation(
        participantIds,
        this.groupName,
        this.groupPhoto || this.defaultGroupPhoto
      );
      
      this.showToast('Groupe créé avec succès', 'success');
      this.router.navigate(['/messaging/chat', conversationId]);
    } catch (error) {
      console.error('Error creating group:', error);
      this.showToast('Erreur lors de la création du groupe', 'danger');
    } finally {
      this.creatingGroup = false;
    }
  }

  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color,
      buttons: [
        {
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    
    await toast.present();
  }
  
  // For future implementation: Allow user to select a group photo
  handlePhotoSelection(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Read file as data URL (for preview)
      const reader = new FileReader();
      reader.onload = () => {
        this.groupPhoto = reader.result as string;
      };
      reader.readAsDataURL(file);
      
      // In a real implementation, you would upload this to Firebase Storage
      // and get a URL to store in Firestore
    }
  }
}
