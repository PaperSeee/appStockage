import { Component, OnInit, OnDestroy } from '@angular/core';
import { ToastController, AlertController } from '@ionic/angular';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';
import { FirebaseService } from '../../../services/firebase.service';
import { MessagingService } from '../../../services/messaging.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FriendsService } from '../../../services/friends.service';

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

  // Add new properties for friends management
  friends: any[] = [];
  showingFriends: boolean = false;
  viewMode: string = 'all';

  constructor(
    private toastController: ToastController,
    private sanitizer: DomSanitizer,
    private firebaseService: FirebaseService,
    private messagingService: MessagingService, // Add messaging service
    private router: Router, // Add router for navigation
    private friendsService: FriendsService // Ajouter le service ici
  ) {}

  async ngOnInit() {
    // Load real users from Firebase
    this.loadUsers();
    
    // Load friends
    await this.loadFriends();
  }

  ngOnDestroy() {
    // Cleanup if subscription exists (kept for safety)
    if (this.refreshIntervalSub) {
      this.refreshIntervalSub.unsubscribe();
    }
  }

  // Modified method to load only real users from Firebase
  async loadUsers() {
    this.loading = true;
    try {
      const users = await this.firebaseService.getAllDocuments('users') as any[];
      
      // Process and map user data
      const processedUsers = users.map(user => ({
        ...user,
        disciplines: user.disciplines || [user.discipline].filter(Boolean),
        distance: user.distance || Math.floor(Math.random() * 20) + 1 // Random distance for demo
      }));
      
      // Only update filtered users if not in friends view
      if (!this.showingFriends) {
        this.filteredUsers = processedUsers;
        console.log('Loaded users:', this.filteredUsers);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      // Initialize with empty array instead of falling back to mock data
      if (!this.showingFriends) {
        this.filteredUsers = [];
      }
    } finally {
      this.loading = false;
    }
  }

  // Method to load friends - utiliser le service d'amis
  async loadFriends() {
    try {
      const user = await this.firebaseService.getCurrentUser() as any;
      if (user && user.uid) {
        const friendsData = await this.friendsService.getFriends(user.uid);
        if (friendsData) {
          this.friends = friendsData;
        }
      }
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  }

  // Improved method to get user's full name
  getUserFullName(user: any): string {
    // First check if name property exists
    if (user.name && typeof user.name === 'string' && user.name.trim()) 
      return user.name;
    
    // Next try firstName and lastName (the format used in our Firestore database)
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    
    // If we have either a firstName or lastName, return the combined name
    if (fullName) return fullName;
    
    // If we have a username, use that instead of the generic "Utilisateur"
    if (user.username && typeof user.username === 'string' && user.username.trim())
      return user.username;
    
    // Last resort fallback
    return 'Utilisateur';
  }

  // Add method for tracking users in ngFor
  trackUserById(index: number, user: any): string {
    return user.id || user.userId || index.toString();
  }

  // Replace toggleFriendsView with two separate methods for better clarity
  switchToFriendsView() {
    this.showingFriends = true;
    this.viewMode = 'friends';
    this.switchView();
  }
  
  switchToAllView() {
    this.showingFriends = false;
    this.viewMode = 'all';
    this.loadUsers(); // Refresh data when switching to all view
    this.switchView();
  }

  // Simplified switchView method
  switchView() {
    if (this.showingFriends) {
      this.filteredUsers = [...this.friends]; // Show only friends
    } else {
      this.applyFilters(); // Show filtered users
    }
  }

  // Check if a user is already a friend
  isFriend(user: any): boolean {
    return this.friends.some(friend => 
      friend.id === user.id || friend.userId === user.userId);
  }

  // Add method to connect with user - utiliser le service d'amis
  async connectWithUser(user: any) {
    const currentUser = await this.firebaseService.getCurrentUser() as any;
    if (!currentUser) {
      const toast = await this.toastController.create({
        message: 'Vous devez être connecté pour ajouter un ami',
        duration: 2000,
        position: 'bottom',
        color: 'warning'
      });
      await toast.present();
      return;
    }

    try {
      if (this.isFriend(user)) {
        // Remove friend using FriendsService
        await this.friendsService.removeFriend(currentUser.uid, user.id || user.userId);
        this.friends = this.friends.filter(friend => 
          friend.id !== user.id && friend.userId !== user.userId);
        
        const toast = await this.toastController.create({
          message: `${this.getUserFullName(user)} retiré de vos amis`,
          duration: 2000,
          position: 'bottom'
        });
        await toast.present();
      } else {
        // Add friend using FriendsService
        await this.friendsService.addFriend(currentUser.uid, user);
        this.friends.push(user);
        
        const toast = await this.toastController.create({
          message: `${this.getUserFullName(user)} ajouté à vos amis`,
          duration: 2000,
          position: 'bottom',
          color: 'success'
        });
        await toast.present();
      }
      
      // Update UI if in friends view
      if (this.showingFriends) {
        this.filteredUsers = [...this.friends];
      }
    } catch (error: any) {
      console.error('Error managing friend:', error);
      
      // Don't show another toast if the Firebase service already showed one for permissions
      if (error.code !== 'permission-denied') {
        const toast = await this.toastController.create({
          message: 'Erreur lors de la gestion de l\'ami',
          duration: 2000,
          position: 'bottom',
          color: 'danger'
        });
        await toast.present();
      }
      
      // If Firebase returned a permission error, show the permissions alert
      if (error.code === 'permission-denied' || 
          (error.message && error.message.includes('Missing or insufficient permissions'))) {
        await this.showFirebasePermissionsAlert();
      }
    }
  }

  // Improve the permissions alert to be more specific about friends
  private async showFirebasePermissionsAlert() {
    const alert = await this.toastController.create({
      header: 'Erreur de permissions Firebase',
      message: `Votre application ne possède pas les permissions nécessaires pour gérer les amis. 
                Vous devez configurer les règles de sécurité Firebase pour permettre l'accès à la 
                sous-collection "friends" dans la collection "users".`,
      duration: 5000,
      position: 'middle',
      color: 'warning',
      buttons: ['OK']
    });
    await alert.present();
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
        await this.showConversationPermissionsAlert();
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

  // Renamed to avoid duplicate function implementation
  private async showConversationPermissionsAlert() {
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
    const target = event.target as HTMLImageElement;
    target.src = 'assets/par défaut.jpg'; // Fallback image
  }
}
