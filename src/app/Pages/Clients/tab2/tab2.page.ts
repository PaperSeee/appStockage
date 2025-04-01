import { Component, OnInit, OnDestroy } from '@angular/core';
import { ToastController, AlertController } from '@ionic/angular';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';
import { FirebaseService } from '../../../services/firebase.service';
import { MessagingService } from '../../../services/messaging.service';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';

interface Partner {
  id: number;
  name: string;
  age: number;
  gender: string;
  photo: string;
  bio: string;
  level: string;
  mainDiscipline: string;
  disciplines: string[];
  distance: number;
  city: string;
}

interface Filters {
  discipline: string[];
  level: string;
  gender: string;
  distance: number;
}

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: false,
})
export class Tab2Page implements OnInit, OnDestroy {
  partners: Partner[] = [];

  filteredPartners: Partner[] = [];
  filteredUsers: any[] = []; // For Firebase users
  currentPartnerIndex = 0;
  isFilterModalOpen = false;
  loading = true; // Add loading property
  creatingConversation = false; // Flag to prevent multiple clicks
  private refreshIntervalSub: Subscription | null = null;

  filters: Filters = {
    discipline: [],
    level: '',
    gender: 'tous',
    distance: 50
  };

  constructor(
    private toastController: ToastController,
    private sanitizer: DomSanitizer,
    private firebaseService: FirebaseService,
    private messagingService: MessagingService, // Add messaging service
    private router: Router // Add router for navigation
  ) {}

  ngOnInit() {
    // Load real users from Firebase
    this.loadUsers();
    this.startAutoRefresh();
  }

  private startAutoRefresh() {
    // Actualiser toutes les 30 secondes
    this.refreshIntervalSub = interval(30000).subscribe(() => {
      this.loadUsers();
    });
  }

  ngOnDestroy() {
    // Nettoyer l'abonnement à l'intervalle
    if (this.refreshIntervalSub) {
      this.refreshIntervalSub.unsubscribe();
    }
  }

  // Modified method to load only real users from Firebase
  async loadUsers() {
    this.loading = true;
    try {
      const users = await this.firebaseService.getAllDocuments('users') as any[];
      this.filteredUsers = users.map(user => ({
        ...user,
        disciplines: user.disciplines || [user.discipline].filter(Boolean),
        distance: user.distance || Math.floor(Math.random() * 20) + 1 // Random distance for demo
      }));
      console.log('Loaded users:', this.filteredUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      // Initialize with empty array instead of falling back to mock data
      this.filteredUsers = [];
    } finally {
      this.loading = false;
    }
  }

  // Add method to get user's full name
  getUserFullName(user: any): string {
    if (user.name) return user.name;
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Utilisateur';
  }

  // Add method for tracking users in ngFor
  trackUserById(index: number, user: any): string {
    return user.id || user.userId || index.toString();
  }

  // Add method to connect with user
  async connectWithUser(user: any) {
    const toast = await this.toastController.create({
      message: `Demande de connexion envoyée à ${this.getUserFullName(user)}`,
      duration: 2000,
      position: 'bottom',
      color: 'success'
    });
    await toast.present();
  }

  openFilters() {
    this.isFilterModalOpen = true;
  }

  closeFilters() {
    this.isFilterModalOpen = false;
  }

  applyFilters() {
    // Only filter the Firebase users
    const allUsers = [...this.filteredUsers];
    
    this.filteredUsers = allUsers.filter(user => {
      // Filter by gender
      if (this.filters.gender !== 'tous' && user.gender !== this.filters.gender) {
        return false;
      }

      // Filter by level
      if (this.filters.level && user.level?.toLowerCase() !== this.filters.level) {
        return false;
      }

      // Filter by discipline
      if (this.filters.discipline && this.filters.discipline.length > 0) {
        const userDisciplines = user.disciplines || [user.discipline];
        const hasMatchingDiscipline = userDisciplines.some((d: string) => 
          d && this.filters.discipline.includes(d.toLowerCase())
        );
        if (!hasMatchingDiscipline) {
          return false;
        }
      }

      // Filter by distance
      if (user.distance > this.filters.distance) {
        return false;
      }

      return true;
    });

    this.closeFilters();
  }

  // Updated method to actually create a conversation and navigate to chat
  async sendMessage(user: any) {
    if (this.creatingConversation) return; // Prevent multiple clicks
    this.creatingConversation = true;

    try {
      // Show loading toast
      const loadingToast = await this.toastController.create({
        message: `Création de la conversation avec ${this.getUserFullName(user)}...`,
        duration: 2000,
        position: 'bottom'
      });
      await loadingToast.present();

      // Create or get an existing conversation
      const conversationId = await this.messagingService.createConversation(user.id || user.userId);
      
      // Navigate to the chat view with this conversation
      this.router.navigate(['/messaging/chat', conversationId]);
      
    } catch (error: any) {
      console.error('Error creating conversation:', error);
      
      // Check if this is a permissions error
      if (error.code === 'permission-denied' || 
          error.message?.includes('Missing or insufficient permissions')) {
        await this.showFirebasePermissionsAlert();
      } else {
        // Show general error toast
        const errorToast = await this.toastController.create({
          message: `Erreur lors de la création de la conversation. Veuillez réessayer.`,
          duration: 3000,
          position: 'bottom',
          color: 'danger'
        });
        await errorToast.present();
      }
    } finally {
      this.creatingConversation = false;
    }
  }

  // New method to show a detailed permissions error alert
  private async showFirebasePermissionsAlert() {
    const alert = await this.toastController.create({
      header: 'Erreur de permissions Firebase',
      message: `Votre application ne possède pas les permissions nécessaires pour créer des conversations. 
                Vous devez configurer les règles de sécurité Firebase pour la collection "conversations".`,
      duration: 5000,
      position: 'middle',
      color: 'warning',
      buttons: ['OK']
    });
    await alert.present();
  }

  // Handle image loading errors
  handleImageError(event: any) {
    event.target.src = 'assets/par défaut.jpg';
  }
}
