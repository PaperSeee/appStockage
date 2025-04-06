import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FirebaseService } from '../../../services/firebase.service';
import { AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { SharingService } from '../../../services/sharing.service';
import { MessagingService } from '../../../services/messaging.service';
import { Subscription, interval } from 'rxjs';
import { TrainingDataService } from '../../../services/training-data.service';
import { FriendsService } from '../../../services/friends.service';

interface Training {
  id: number;
  user: User;
  type: string;
  title: string;
  description: string;
  duration: number;
  location: string;
  image: string;
  likes: number;
  comments: number;
  date: Date;
}

interface User {
  id: number;
  name: string;
  avatar: string;
  discipline: string;
  level: string;
  location: string;
}

interface WeeklySummary {
  sessions: number;
  totalMinutes: number;
  intensity: number;
  progress: number;
}

interface Event {
  id: number;
  title: string;
  date: Date;
  location: string;
  type: string;
  image: string;
  participantsCount: number;
  distance: number; // Distance en km
}

interface Comment {
  id: number;
  userId: number;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: Date;
  likes: number;
}

interface Media {
  id: number;
  type: string;
  url: string;
}

// Ajout de l'interface Post pour le feed social
interface Post {
  id: number;
  user: User;
  content: string;
  timestamp: Date;
  type?: 'Sparring' | 'Compétition' | 'Entraînement' | 'Question' | 'Conseils';
  tags?: string[];
  media?: Media[];
  event?: Event;
  likes: { userId: number }[];
  comments: Comment[];
  shares: number;
  userLiked?: boolean;
  showComments?: boolean;
  newComment?: string;
  userId?: string;
  // Propriété ajoutée pour le classement
  score?: number;
}

// Add a proper interface for search results
interface FirebaseUserResult {
  id: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  photo?: string;
  discipline?: string;
  // Any other properties from Firebase
}

// Keep your existing UserSearchResult interface for display in the component
interface UserSearchResult {
  id: string;
  name: string;
  photo: string;
  username: string;
  discipline: string;
}

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Tab1Page implements OnInit, OnDestroy {
  trainings: Training[] = [];
  nearbyPartners: User[] = [];
  upcomingEvents: Event[] = [];
  disciplineFilter: string = 'all'; // Set default filter to 'all'
  locationFilter: string = '';
  weeklySummary: WeeklySummary = {
    sessions: 3,
    totalMinutes: 210,
    intensity: 4.5,
    progress: 65
  };
  
  searchTerm: string = '';
  filteredEvents: any[] = [];
  filteredPartners: any[] = [];
  filteredTrainings: any[] = [];
  
  unreadMessageCount: number = 0;
  private conversationsSub: Subscription | null = null;
  
  // Add property for training stats
  trainingStats = {
    count: 0,
    totalMinutes: 0,
    intensity: 0,
    progress: 65
  };
  
  private trainingSubscription: Subscription | null = null;
  private friendsSubscription: Subscription | null = null;
  friends: any[] = [];
  filteredFriends: any[] = [];
  loadingFriends = true;
  
  // Ajouter les propriétés pour les posts
  socialPosts: Post[] = [];
  topPosts: Post[] = [];
  private intervalSubscription: Subscription | null = null;

  // Add these properties to your class
  searchResults: any[] = [];
  showSearchResults: boolean = false;
  isSearching: boolean = false;
  
  constructor(
    private firebaseService: FirebaseService,
    private alertController: AlertController,
    private router: Router,
    private sharingService: SharingService,
    private messagingService: MessagingService,
    private trainingDataService: TrainingDataService,
    private friendsService: FriendsService, // Ajouter le service ici
    private cdr: ChangeDetectorRef // Ajouter le ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadMockData();
    
    // Initialize filtered arrays
    this.filteredEvents = [...this.upcomingEvents];
    this.filteredPartners = [...this.nearbyPartners];
    this.filteredTrainings = [...this.trainings];
    
    // Load friends
    this.loadFriends();
    
    // Subscribe to conversations to get unread count
    this.conversationsSub = this.messagingService.conversations$.subscribe(conversations => {
      this.unreadMessageCount = this.messagingService.getTotalUnreadCount();
      this.cdr.markForCheck(); // Marquer pour la vérification
    });
    
    // Subscribe to training stats from shared service
    this.trainingSubscription = this.trainingDataService.stats$.subscribe(stats => {
      this.trainingStats.count = stats.count;
      this.trainingStats.totalMinutes = Math.round(stats.hours * 60); // Convert hours to minutes
      this.trainingStats.intensity = stats.intensity || 0;
      this.cdr.markForCheck(); // Marquer pour la vérification
    });

    // S'abonner aux mises à jour des amis
    this.friendsSubscription = this.friendsService.friendsUpdated$.subscribe(() => {
      console.log('Friends updated, refreshing friends list in tab1');
      this.loadFriends();
    });

    // Charger les meilleurs posts sociaux
    this.loadTopSocialPosts();
    
    // Rafraîchir les posts toutes les 5 minutes
    this.intervalSubscription = interval(5 * 60 * 1000).subscribe(() => {
      this.loadTopSocialPosts();
      this.cdr.markForCheck();
    });
  }

  loadMockData() {
    // Mock data for trainings
    this.trainings = [
      {
        id: 1,
        user: {
          id: 1,
          name: 'Thomas D.',
          avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
          discipline: 'MMA',
          level: 'Intermédiaire',
          location: 'Paris'
        },
        type: 'Sparring',
        title: 'Session intense de MMA',
        description: 'Travail de grappling et de striking avec Marc. Bon cardio !',
        duration: 75,
        location: 'Fight Club Paris',
        image: 'https://images.pexels.com/photos/6295829/pexels-photo-6295829.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
        likes: 24,
        comments: 6,
        date: new Date(2023, 10, 1, 18, 30)
      },
      {
        id: 2,
        user: {
          id: 2,
          name: 'Julie M.',
          avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
          discipline: 'Boxe',
          level: 'Avancé',
          location: 'Lyon'
        },
        type: 'Technique',
        title: 'Perfectionnement uppercut',
        description: 'Session technique sur l\'uppercut et les enchaînements. Focus sur la précision.',
        duration: 45,
        location: 'Boxing Academy',
        image: 'https://images.pexels.com/photos/4752861/pexels-photo-4752861.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
        likes: 31,
        comments: 8,
        date: new Date(2023, 10, 2, 10, 0)
      },
      {
        id: 3,
        user: {
          id: 3,
          name: 'Karim L.',
          avatar: 'https://randomuser.me/api/portraits/men/67.jpg',
          discipline: 'Jiu-Jitsu',
          level: 'Expert',
          location: 'Marseille'
        },
        type: 'Compétition',
        title: 'Préparation championnat régional',
        description: 'Dernière session avant le championnat de dimanche. Travail sur les transitions.',
        duration: 90,
        location: 'Dojo Central',
        image: 'https://images.pexels.com/photos/7045664/pexels-photo-7045664.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
        likes: 47,
        comments: 12,
        date: new Date(2023, 10, 3, 16, 15)
      }
    ];

    // Mock data for nearby sparring partners
    this.nearbyPartners = [
      {
        id: 4,
        name: 'Alex R.',
        avatar: 'https://randomuser.me/api/portraits/men/36.jpg',
        discipline: 'Muay Thai',
        level: 'Intermédiaire',
        location: 'Paris'
      },
      {
        id: 5,
        name: 'Sophie D.',
        avatar: 'https://randomuser.me/api/portraits/women/29.jpg',
        discipline: 'MMA',
        level: 'Débutant',
        location: 'Paris'
      },
      {
        id: 6,
        name: 'Michael T.',
        avatar: 'https://randomuser.me/api/portraits/men/52.jpg',
        discipline: 'Boxe',
        level: 'Avancé',
        location: 'Paris'
      }
    ];

    // Mock data for upcoming events
    this.upcomingEvents = [
      {
        id: 1,
        title: "Open de Jiu-Jitsu",
        date: new Date(2023, 11, 15, 10, 0),
        location: "Salle Olympique, Paris",
        type: "Compétition",
        image: "https://images.pexels.com/photos/9484504/pexels-photo-9484504.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        participantsCount: 42,
        distance: 3.2
      },
      {
        id: 2,
        title: "Workshop MMA Débutants",
        date: new Date(2023, 11, 8, 14, 30),
        location: "Fight Club Central",
        type: "Workshop",
        image: "https://images.pexels.com/photos/8032834/pexels-photo-8032834.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        participantsCount: 18,
        distance: 1.5
      },
      {
        id: 3,
        title: "Sparring Session Boxe",
        date: new Date(2023, 11, 5, 19, 0),
        location: "Boxing Center",
        type: "Entrainement",
        image: "https://images.pexels.com/photos/6203631/pexels-photo-6203631.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        participantsCount: 24,
        distance: 4.7
      }
    ];
  }

  filterTrainings() {
    // Implement filtering logic here
    console.log('Filtering with:', this.disciplineFilter, this.locationFilter);
  }

  likeTraining(training: Training) {
    training.likes++;
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  shareWeeklySummary() {
    const url = window.location.href;
    const title = 'Mon résumé hebdomadaire d\'entraînement';
    const text = `Cette semaine: ${this.trainingStats.count} entraînements, ${this.trainingStats.totalMinutes} minutes, intensité ${this.trainingStats.intensity}/5.`;
    
    // Remove the call to showShareOptions
    // this.sharingService.showShareOptions(title, text, url);
  }

  formatEventDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    }) + ' à ' + date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  async onAddButtonClick() {
    const isLoggedIn = await this.firebaseService.isUserLoggedIn();
    if (!isLoggedIn) {
      const alert = await this.alertController.create({
        header: 'Pas encore inscrit',
        message: 'Vous devez être connecté pour ajouter un élément.',
        buttons: [
          {
            text: 'Annuler',
            role: 'cancel'
          },
          {
            text: 'S\'inscrire',
            handler: () => {
              window.location.href = '/register'; // Redirige vers la page d'inscription
            }
          }
        ]
      });
      await alert.present();
      return;
    }

    // Logique pour ajouter un élément si l'utilisateur est connecté
    console.log('Ajouter un élément');
  }

  async onEventRegister(event: Event) {
    const isLoggedIn = await this.firebaseService.isUserLoggedIn();
    if (!isLoggedIn) {
      const alert = await this.alertController.create({
        header: 'Pas encore inscrit',
        message: 'Vous devez être connecté pour vous inscrire à un événement.',
        buttons: [
          {
            text: 'Annuler',
            role: 'cancel'
          },
          {
            text: 'S\'inscrire',
            handler: () => {
              window.location.href = '/register'; // Redirige vers la page d'inscription
            }
          }
        ]
      });
      await alert.present();
      return;
    }

    // Logique pour s'inscrire à l'événement si l'utilisateur est connecté
    console.log('Inscription à l\'événement:', event);
  }

  async openProfile() {
    const isLoggedIn = await this.firebaseService.isUserLoggedIn();
    
    if (isLoggedIn) {
      // Si l'utilisateur est connecté, naviguer vers la page de profil
      this.router.navigate(['/profile']);
    } else {
      // Si l'utilisateur n'est pas connecté, naviguer vers la page de connexion
      this.router.navigate(['/login']);
    }
  }

  async goToProfile() {
    const isLoggedIn = await this.firebaseService.isUserLoggedIn();
    if (isLoggedIn) {
      this.router.navigate(['/profile']);
    } else {
      this.router.navigate(['/login']);
    }
  }

  filterByDiscipline(discipline: string) {
    this.disciplineFilter = discipline;
    
    if (discipline === 'all') {
      // If 'all' is selected, show all items
      this.filteredEvents = [...this.upcomingEvents];
      this.filteredPartners = [...this.nearbyPartners];
      this.filteredTrainings = [...this.trainings];
      this.filteredFriends = [...this.friends];
      return;
    }
    
    // Filter events by discipline/type
    this.filteredEvents = this.upcomingEvents.filter(event =>
      event.type.toLowerCase() === discipline.toLowerCase());
    
    // Filter partners by discipline
    this.filteredPartners = this.nearbyPartners.filter(partner =>
      partner.discipline.toLowerCase().includes(discipline.toLowerCase()));
    
    // Filter trainings by discipline
    this.filteredTrainings = this.trainings.filter(training =>
      training.type.toLowerCase() === discipline.toLowerCase() || 
      training.user.discipline.toLowerCase() === discipline.toLowerCase());
    
    // Filter friends by discipline
    this.filteredFriends = this.friends.filter(friend =>
      friend.discipline && friend.discipline.toLowerCase().includes(discipline.toLowerCase()));
    
    this.cdr.markForCheck();
  }
  
  // Replace or update the searchItems function
  async searchItems() {
    // Clear previous results
    this.searchResults = [];
    this.showSearchResults = false;
    
    const term = this.searchTerm.trim();
    
    // If empty search or too short, don't do anything
    if (!term || term.length < 2) {
      this.isSearching = false;
      return;
    }
    
    // Search for user profiles
    this.isSearching = true;
    
    try {
      // Use firebaseService to search for users
      const users = await this.firebaseService.searchUsers(term);
      
      if (users && users.length > 0) {
        // Map from Firebase user format to display format
        this.searchResults = users.map(user => ({
          id: user.id,
          name: this.getUserFullName(user),
          photo: user.photo || 'assets/par défaut.jpg',
          username: user.username || '',
          discipline: user.discipline || 'Utilisateur'
        }));
        
        this.showSearchResults = true;
      }
    } catch (error) {
      console.error('Error searching for users:', error);
    } finally {
      this.isSearching = false;
      this.cdr.markForCheck();
    }
  }

  // Ajout des fonctions trackBy pour optimiser le rendu des listes
  trackTrainingById(index: number, item: Training): number {
    return item.id;
  }
  
  trackEventById(index: number, item: Event): number {
    return item.id;
  }
  
  trackPartnerById(index: number, item: User): number {
    return item.id;
  }

  // Tracking function for friends
  trackFriendById(index: number, item: any): string {
    return item.id || item.userId || index.toString();
  }
  
  // Fonction de tracking pour les posts
  trackPostById(index: number, item: Post): number {
    return item.id;
  }

  ngOnDestroy() {
    if (this.conversationsSub) {
      this.conversationsSub.unsubscribe();
    }
    
    if (this.trainingSubscription) {
      this.trainingSubscription.unsubscribe();
    }
    
    // Désabonner de la souscription aux amis
    if (this.friendsSubscription) {
      this.friendsSubscription.unsubscribe();
    }
    
    // S'assurer que l'intervalle est nettoyé
    if (this.intervalSubscription) {
      this.intervalSubscription.unsubscribe();
    }
  }

  // Load friends from Firebase using FriendsService
  async loadFriends() {
    this.loadingFriends = true;
    try {
      const user = await this.firebaseService.getCurrentUser() as any;
      if (user && user.uid) {
        const friendsData = await this.friendsService.getFriends(user.uid);
        if (friendsData) {
          this.friends = friendsData;
          
          // Si un filtre de discipline est actif, l'appliquer
          if (this.disciplineFilter !== 'all') {
            this.filteredFriends = this.friends.filter(friend => 
              friend.discipline && friend.discipline.toLowerCase().includes(this.disciplineFilter.toLowerCase())
            );
          } else {
            this.filteredFriends = [...this.friends];
          }
        }
      }
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      this.loadingFriends = false;
      this.cdr.markForCheck();
    }
  }

  // Handle image loading errors
  handleImageError(event: any) {
    event.target.src = 'assets/par défaut.jpg';
  }

  // Get user's full name
  getUserFullName(user: any): string {
    if (!user) return 'Utilisateur';
    
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    
    if (user.name) {
      return user.name;
    }
    
    if (user.displayName) {
      return user.displayName;
    }
    
    return 'Utilisateur';
  }
  
  // Méthode pour charger les meilleurs posts sociaux
  async loadTopSocialPosts() {
    try {
      // Récupérer tous les posts sociaux
      const allPosts = await this.firebaseService.getAllPosts(50) as any[];
      
      if (allPosts && allPosts.length > 0) {
        // Transformer les données des posts
        this.socialPosts = allPosts.map(post => {
          return {
            id: parseInt(post.id || '0'),
            user: post.user || {
              id: 0,
              name: 'Utilisateur inconnu',
              avatar: 'assets/par défaut.jpg',
              discipline: ''
            },
            content: post.content || '',
            media: post.media || [],
            tags: post.tags || [],
            type: post.type || '',
            likes: post.likes || [],
            comments: post.comments || [],
            shares: post.shares || 0,
            timestamp: post.timestamp?.toDate ? post.timestamp.toDate() : new Date(),
            userLiked: false
          };
        });
        
        // Appliquer l'algorithme de classement
        this.topPosts = this.findTopPosts(this.socialPosts, 3);
        this.cdr.markForCheck();
      }
    } catch (error) {
      console.error('Erreur lors du chargement des posts sociaux:', error);
    }
  }
  
  // Algorithme pour trouver les meilleurs posts
  findTopPosts(posts: Post[], count: number): Post[] {
    // Calculer un score pour chaque post
    const scoredPosts = posts.map(post => {
      // Les facteurs de classement
      const likesWeight = 1;
      const commentsWeight = 1.5;
      const recencyWeight = 2;
      const sharesWeight = 1.2;
      
      // Calcul de la fraîcheur (plus récent = meilleur score)
      const now = new Date();
      const postAge = now.getTime() - post.timestamp.getTime();
      const ageInHours = postAge / (1000 * 60 * 60);
      const recencyScore = Math.max(0, 24 - ageInHours) / 24; // Score plus élevé pour les posts des dernières 24h
      
      // Facteur de pertinence par discipline
      const disciplineMatch = this.disciplineFilter !== 'all' && 
                            post.tags?.includes(this.disciplineFilter) ? 1.5 : 1;
      
      // Calcul du score total
      const score = (
        (post.likes.length * likesWeight) +
        (post.comments.length * commentsWeight) +
        (post.shares * sharesWeight) +
        (recencyScore * recencyWeight)
      ) * disciplineMatch;
      
      return { ...post, score };
    });
    
    // Trier les posts par score (du plus élevé au plus bas)
    scoredPosts.sort((a, b) => (b.score || 0) - (a.score || 0));
    
    // Retourner les N meilleurs posts
    return scoredPosts.slice(0, count);
  }
  
  // Fonction pour obtenir l'image principale d'un post
  getPostMainImage(post: Post): string {
    if (post.media && post.media.length > 0) {
      return post.media[0].url;
    }
    return 'assets/default-post-image.jpg';
  }
  
  // Fonction pour formater le contenu du post (tronquer si trop long)
  formatPostContent(content: string): string {
    if (content.length > 120) {
      return content.substring(0, 120) + '...';
    }
    return content;
  }
  
  // Fonction pour ouvrir un post social dans la page sociale
  viewFullPost(postId: number) {
    // Naviguer vers la page sociale et y afficher le post spécifique
    this.router.navigate(['/tabs/tab3'], { queryParams: { postId: postId } });
  }

  viewUserProfile(userId: number | string) {
    // Convert number IDs to string if needed
    const id = userId.toString();
    this.router.navigate(['/tabs/user-profile', id]);
  }

  // Clear search results when clicking elsewhere
  clearSearchResults() {
    setTimeout(() => {
      this.showSearchResults = false;
      this.cdr.markForCheck();
    }, 200);
  }
}
