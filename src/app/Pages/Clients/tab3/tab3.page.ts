import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ActionSheetController, AlertController, ModalController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SharingService } from '../../../services/sharing.service';
import { FirebaseService } from '../../../services/firebase.service'; 
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { PostCreatorComponent } from '../post-creator/post-creator.component';

// Define interface for Firebase user data
interface UserData {
  id?: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  photo?: string;
  discipline?: string;
  [key: string]: any; // Allow for other properties
}

interface User {
  id: number;
  name: string;
  avatar: string;
  discipline?: string;
  level?: string;
}

interface Comment {
  id: number;
  user: User;
  text: string;
  timestamp: Date;
  likes: number;
}

interface Media {
  id: number;
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
}

interface Event {
  id: number;
  title: string;
  date: Date;
  location: string;
  attendees: number;
  image: string;
}

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
}

interface Story {
  id: number;
  user: User;
  media: Media[];
  timestamp: Date;
  viewed: boolean;
}

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: false,
})
export class Tab3Page implements OnInit {
  currentUser: User = {
    id: 0,
    name: 'Thomas Durand',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    discipline: 'MMA',
    level: 'Intermédiaire'
  };
  
  posts: Post[] = [];
  filteredPosts: Post[] = [];
  stories: Story[] = [];
  notifications: any[] = [];
  loading: boolean = true;
  selectedFilter: string = 'all';
  searchTerm: string = '';

  isAuthenticated = false;
  userId: string | null = null;
  newPost = {
    content: '',
    tags: [] as string[],
    media: [] as any[],
    type: '' // 'training', 'competition', etc.
  };
  availableTags = ['training', 'competition', 'technique', 'mma', 'boxe', 'jiu-jitsu', 'muay-thai'];

  constructor(
    private router: Router,
    private toastController: ToastController,
    private alertController: AlertController,
    private actionSheetController: ActionSheetController,
    private modalController: ModalController,
    private sharingService: SharingService,
    private firebaseService: FirebaseService
  ) {}

  async ngOnInit() {
    this.loadMockData();
    setTimeout(() => {
      this.loading = false;
      this.filteredPosts = [...this.posts];
    }, 1500);

    // Check authentication
    try {
      const user = await this.firebaseService.getCurrentUser() as any;
      this.isAuthenticated = !!user;
      if (user && user.uid) {
        this.userId = user.uid;
        
        // Add null check before calling getDocument
        if (this.userId) {
          // Use type assertion to properly type the userData
          const userData = await this.firebaseService.getDocument('users', this.userId) as UserData;
          
          if (userData) {
            this.currentUser = {
              id: parseInt(this.userId || '0'),
              name: `${userData?.firstName || ''} ${userData?.lastName || ''}`,
              avatar: userData?.photo || 'assets/default-avatar.png',
              discipline: userData?.discipline
            };
          }
        }
        
        // Load real posts from Firebase
        this.loadPosts();
      } else {
        // Use mock data for non-authenticated users
        this.loadMockData();
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      this.loadMockData();
    }
  }

  async loadPosts() {
    this.loading = true;
    try {
      // Utilisation de la nouvelle méthode pour charger tous les posts
      const postsData = await this.firebaseService.getAllPosts(50) as any[];
      
      if (!postsData || postsData.length === 0) {
        console.log('Aucun post trouvé ou problème d\'accès. Chargement des données de test...');
        this.loadMockData();
        return;
      }
      
      // Transform Firebase data to match our Post interface
      this.posts = postsData.map(post => {
        // S'assurer que tous les champs nécessaires sont présents
        return {
          id: parseInt(post.id || '0') || Math.floor(Math.random() * 1000),
          user: post.user || {
            id: 0,
            name: 'Utilisateur inconnu',
            avatar: 'https://ionicframework.com/docs/img/demos/avatar.svg',
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
          userLiked: (post.likes || []).some((like: any) => like.userId === this.currentUser.id) || false,
          showComments: false,
          newComment: ''
        };
      });
      
      // Tri déjà effectué dans la requête Firestore, mais au cas où
      this.posts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      this.filteredPosts = [...this.posts];
      
      console.log(`${this.posts.length} posts chargés avec succès`);
    } catch (error) {
      console.error('Error loading posts:', error);
      // Fallback to mock data
      this.loadMockData();
    } finally {
      this.loading = false;
    }
  }

  // Ajouter une méthode pour charger les posts d'un utilisateur spécifique
  async loadUserPosts(userId: string) {
    this.loading = true;
    try {
      const postsData = await this.firebaseService.getUserPosts(userId) as any[];
      if (postsData && postsData.length > 0) {
        // Utiliser le même mapping que pour loadPosts
        const userPosts = postsData.map(post => {
          return {
            id: parseInt(post.id || '0') || Math.floor(Math.random() * 1000),
            user: post.user || {
              id: 0,
              name: 'Utilisateur inconnu',
              avatar: 'https://ionicframework.com/docs/img/demos/avatar.svg',
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
            userLiked: (post.likes || []).some((like: any) => like.userId === this.currentUser.id) || false,
            showComments: false,
            newComment: ''
          };
        });
        
        // Mise à jour des posts filtrés uniquement
        this.filteredPosts = userPosts;
      } else {
        // Aucun post trouvé pour cet utilisateur
        this.filteredPosts = [];
        const toast = await this.toastController.create({
          message: 'Aucune publication trouvée pour cet utilisateur',
          duration: 2000
        });
        await toast.present();
      }
    } catch (error) {
      console.error('Error loading user posts:', error);
      this.filteredPosts = [];
    } finally {
      this.loading = false;
    }
  }

  loadMockData() {
    // Mock users
    const users: User[] = [
      {
        id: 1,
        name: 'Sophie Laurent',
        avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
        discipline: 'Boxe',
        level: 'Avancé'
      },
      {
        id: 2,
        name: 'Marc Dubois',
        avatar: 'https://randomuser.me/api/portraits/men/55.jpg',
        discipline: 'Jiu-Jitsu',
        level: 'Expert'
      },
      {
        id: 3,
        name: 'Julie Martin',
        avatar: 'https://randomuser.me/api/portraits/women/33.jpg',
        discipline: 'Muay Thai',
        level: 'Intermédiaire'
      },
      {
        id: 4,
        name: 'Antoine Leclerc',
        avatar: 'https://randomuser.me/api/portraits/men/22.jpg',
        discipline: 'MMA',
        level: 'Débutant'
      }
    ];

    // Mock posts
    this.posts = [
      {
        id: 1,
        user: users[0],
        content: 'Super entraînement aujourd\'hui au club ! 10 rounds de sparring et beaucoup de progrès sur mon jab-cross. Le coach a dit que j\'étais prête pour la compétition du mois prochain. Qui d\'autre sera là? 🥊',
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        type: 'Entraînement',
        tags: ['boxe', 'sparring', 'progression'],
        media: [
          {
            id: 1,
            type: 'image',
            url: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80'
          }
        ],
        likes: [{ userId: 2 }, { userId: 3 }],
        comments: [
          {
            id: 1,
            user: users[3],
            text: 'Bravo Sophie! Je serai à la compétition aussi, on pourra s\'encourager 👊',
            timestamp: new Date(Date.now() - 1000 * 60 * 20),
            likes: 1
          }
        ],
        shares: 2,
        userLiked: false
      },
      {
        id: 2,
        user: users[1],
        content: 'Question technique pour les pratiquants de BJJ: comment améliorez-vous votre garde? J\'ai du mal à maintenir ma position quand je suis contre des adversaires plus lourds. Des conseils?',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
        type: 'Question',
        tags: ['bjj', 'technique', 'garde'],
        likes: [{ userId: 0 }, { userId: 3 }, { userId: 4 }],
        comments: [
          {
            id: 2,
            user: users[2],
            text: 'Essaie de travailler ton angle et tes hanches plutôt que de compter sur ta force. Tu peux aussi voir des vidéos de Roger Gracie, son jeu de garde est excellent!',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
            likes: 4
          },
          {
            id: 3,
            user: this.currentUser,
            text: 'J\'avais le même problème. Ce qui m\'a aidé c\'est de faire des exercices spécifiques de renforcement du core et de travailler la garde fermée avant de passer aux gardes ouvertes.',
            timestamp: new Date(Date.now() - 1000 * 60 * 30),
            likes: 2
          }
        ],
        shares: 5,
        userLiked: true
      },
      {
        id: 3,
        user: users[2],
        content: 'Première compétition de Muay Thai ce weekend! Très stressée mais aussi super excitée. Quelqu\'un d\'autre y participe?',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
        type: 'Compétition',
        tags: ['muaythai', 'competition', 'debutant'],
        media: [
          {
            id: 2,
            type: 'image',
            url: 'https://images.unsplash.com/photo-1599058917765-a780eda07a3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1169&q=80'
          }
        ],
        event: {
          id: 1,
          title: 'Championnats Régionaux de Muay Thai',
          date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
          location: 'Gymnase Marcel Cerdan, Paris',
          attendees: 48,
          image: 'https://images.unsplash.com/photo-1599058917765-a780eda07a3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1169&q=80'
        },
        likes: [{ userId: 0 }, { userId: 1 }],
        comments: [],
        shares: 1,
        userLiked: true
      }
    ];

    // Mock stories
    this.stories = [
      {
        id: 1,
        user: users[0],
        media: [
          {
            id: 1,
            type: 'image',
            url: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80'
          }
        ],
        timestamp: new Date(Date.now() - 1000 * 60 * 120),
        viewed: false
      },
      {
        id: 2,
        user: users[1],
        media: [
          {
            id: 2,
            type: 'video',
            url: 'https://example.com/video1.mp4',
            thumbnail: 'https://images.unsplash.com/photo-1577998474517-7a146cbbef25?ixlib=rb-4.0.3&auto=format&fit=crop&w=687&q=80'
          }
        ],
        timestamp: new Date(Date.now() - 1000 * 60 * 180),
        viewed: true
      },
      {
        id: 3,
        user: users[2],
        media: [
          {
            id: 3,
            type: 'image',
            url: 'https://images.unsplash.com/photo-1599058917765-a780eda07a3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1169&q=80'
          }
        ],
        timestamp: new Date(Date.now() - 1000 * 60 * 240),
        viewed: false
      }
    ];

    // Mock notifications
    this.notifications = [
      {
        id: 1,
        type: 'like',
        user: users[1],
        timestamp: new Date(Date.now() - 1000 * 60 * 60)
      },
      {
        id: 2,
        type: 'comment',
        user: users[2],
        timestamp: new Date(Date.now() - 1000 * 60 * 120)
      }
    ];
  }

  refreshFeed(event: any) {
    this.loadMockData();
    setTimeout(() => {
      this.filteredPosts = [...this.posts];
      event.target.complete();
    }, 1000);
  }

  filterPosts(filter: string) {
    this.selectedFilter = filter;
    if (filter === 'all') {
      this.filteredPosts = [...this.posts];
    } else {
      this.filteredPosts = this.posts.filter(post => {
        return post.user.discipline?.toLowerCase() === filter || 
               post.type?.toLowerCase() === filter || 
               post.tags?.includes(filter);
      });
    }
  }

  searchPosts() {
    if (!this.searchTerm.trim()) {
      this.filterPosts(this.selectedFilter);
      return;
    }

    const term = this.searchTerm.toLowerCase().trim();
    this.filteredPosts = this.posts.filter(post => {
      return post.content.toLowerCase().includes(term) ||
             post.user.name.toLowerCase().includes(term) ||
             post.tags?.some(tag => tag.includes(term));
    });
  }

  searchByTag(tag: string) {
    this.searchTerm = tag;
    this.searchPosts();
  }

  async openPostCreator(type?: string) {
    if (!this.isAuthenticated) {
      const toast = await this.toastController.create({
        message: 'Vous devez être connecté pour créer une publication',
        duration: 2000,
        position: 'bottom',
        buttons: [
          {
            text: 'Se connecter',
            handler: () => {
              this.router.navigate(['/login']);
            }
          }
        ]
      });
      await toast.present();
      return;
    }
    
    const modal = await this.modalController.create({
      component: PostCreatorComponent,
      componentProps: {
        postType: type
      }
    });
    
    await modal.present();
    
    const { data } = await modal.onDidDismiss();
    if (data && data.submitted) {
      await this.createPost(data.post);
    }
  }

  async createPost(postData: any) {
    this.loading = true;
    
    try {
      // Upload media files if needed
      const mediaUrls: any[] = [];
      for (const media of postData.media) {
        if (media.url.startsWith('data:')) {
          // For now, we'll just use the data URL directly instead of uploading to Firebase Storage
          // This is a temporary solution until Firebase storage upload is properly implemented
          mediaUrls.push({
            type: media.type,
            url: media.url,
            id: Math.floor(Math.random() * 10000)
          });
          
          /* Uncomment this when you have implemented Firebase Storage
          // Convert data URL to File
          const response = await fetch(media.url);
          const blob = await response.blob();
          const fileName = `post_${Date.now()}_${mediaUrls.length}.${media.type === 'image' ? 'jpg' : 'mp4'}`;
          const file = new File([blob], fileName, { type: media.type === 'image' ? 'image/jpeg' : 'video/mp4' });
          
          // Upload to Firebase Storage
          const uploadUrl = await this.firebaseService.uploadFile(file, `posts/${this.userId}/${fileName}`);
          mediaUrls.push({
            type: media.type,
            url: uploadUrl,
            id: Math.floor(Math.random() * 10000)
          });
          */
        } else {
          mediaUrls.push({...media, id: Math.floor(Math.random() * 10000)});
        }
      }
      
      // Create post object
      const post = {
        userId: this.userId,
        user: {
          id: this.currentUser.id,
          name: this.currentUser.name,
          avatar: this.currentUser.avatar,
          discipline: this.currentUser.discipline || ''
        },
        content: postData.content,
        media: mediaUrls,
        tags: postData.tags,
        type: postData.type,
        likes: [],
        comments: [],
        shares: 0,
        timestamp: new Date()
      };
      
      // Save to Firebase
      await this.firebaseService.addDocument('posts', post);
      
      // Refresh posts
      await this.loadPosts();
      
      const toast = await this.toastController.create({
        message: 'Publication créée avec succès',
        duration: 2000
      });
      await toast.present();
    } catch (error) {
      console.error('Error creating post:', error);
      const toast = await this.toastController.create({
        message: 'Erreur lors de la création de la publication',
        duration: 2000
      });
      await toast.present();
    } finally {
      this.loading = false;
    }
  }

  toggleLike(post: Post) {
    const userId = this.currentUser.id;
    const alreadyLiked = post.likes.some(like => like.userId === userId);
    
    if (alreadyLiked) {
      post.likes = post.likes.filter(like => like.userId !== userId);
      post.userLiked = false;
    } else {
      post.likes.push({ userId });
      post.userLiked = true;
    }
  }

  toggleComments(post: Post) {
    post.showComments = !post.showComments;
  }

  addComment(post: Post) {
    if (!post.newComment?.trim()) return;
    
    const comment: Comment = {
      id: Math.floor(Math.random() * 1000),
      user: this.currentUser,
      text: post.newComment,
      timestamp: new Date(),
      likes: 0
    };
    
    post.comments.push(comment);
    post.newComment = '';
  }

  likeComment(comment: Comment) {
    comment.likes++;
  }

  replyToComment(comment: Comment) {
    // Here we would focus the comment input and maybe add a prefix like "@username "
    console.log('Replying to comment', comment);
  }

  sharePost(post: Post) {
    post.shares++;
    // Utilisation de l'URL de l'application plutôt qu'une URL web
    const appUrl = `appfight://post/${post.id}`;
    this.showShareOptions(post.content, 'Publication', appUrl);
  }

  async showShareOptions(text: string, title: string, url: string) {
    await this.sharingService.showShareOptions(title, text, url);
  }

  openNotifications() {
    // Here we would open a notifications panel
    console.log('Opening notifications');
  }

  viewProfile(userId: number) {
    // Si c'est l'utilisateur actuel, on pourrait naviguer vers son profil complet
    if (userId === this.currentUser.id) {
      console.log('Viewing my own profile', userId);
      // this.router.navigate(['/tabs/tab5']); // Probablement l'onglet de profil
    } else {
      // Pour les autres utilisateurs, on charge simplement leurs posts
      console.log('Viewing user profile and posts', userId);
      this.loadUserPosts(userId.toString());
      
      // Changer le filtre actif pour indiquer qu'on regarde un profil spécifique
      this.selectedFilter = 'user';
    }
  }

  // Ajouter un bouton pour revenir à tous les posts
  resetFeed() {
    this.selectedFilter = 'all';
    this.loadPosts();
  }

  viewStory(story: Story) {
    // Here we would open a story viewer
    console.log('Viewing story', story);
  }

  createStory() {
    // Here we would open a story creator
    console.log('Creating story');
  }

  openMedia(media: Media) {
    // Here we would open a media viewer
    console.log('Opening media', media);
  }

  showPostOptions(post: Post) {
    // Here we would show a context menu
    console.log('Showing post options', post);
  }

  registerForEvent(event: Event) {
    // Here we would open a registration form
    console.log('Registering for event', event);
  }
}