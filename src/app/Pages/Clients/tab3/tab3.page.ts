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
  userId?: string; // Ajout de la propriété userId qui est utilisée dans le code
}

// Ajouter une interface pour les notifications
interface Notification {
  id: number;
  type: 'like' | 'comment';
  postId: number;
  fromUser: User;
  timestamp: Date;
  read: boolean;
  content?: string; // Pour le contenu du commentaire
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
  templateUrl: './tab3.page.html',
  styleUrls: ['./tab3.page.scss'],
  standalone: false
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
  notifications: Notification[] = [];
  unreadNotifications: number = 0;
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
    // Commencer avec un tableau vide au lieu de charger des données fictives
    this.posts = [];
    this.filteredPosts = [];
    this.stories = [];
    this.notifications = [];
    
    setTimeout(() => {
      this.loading = false;
    }, 1000);

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
              avatar: userData?.photo || 'assets/par défaut.jpg',
              discipline: userData?.discipline
            };
          }
        }
        
        // Load real posts from Firebase
        this.loadPosts();
      } else {
        // Afficher l'état vide au lieu de charger des données fictives
        this.loading = false;
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      this.loading = false;
    }

    // Charger les notifications
    await this.loadNotifications();
  }

  async loadPosts() {
    this.loading = true;
    try {
      // Utilisation de la méthode pour charger tous les posts
      const postsData = await this.firebaseService.getAllPosts(50) as any[];
      
      if (!postsData || postsData.length === 0) {
        console.log('Aucun post trouvé ou problème d\'accès.');
        this.posts = [];
        this.filteredPosts = [];
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
      // Ne plus charger de données fictives en cas d'erreur
      this.posts = [];
      this.filteredPosts = [];
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

  // Remplacer le contenu de loadMockData par une version vide qui n'initialise pas de faux posts
  loadMockData() {
    // Initialiser avec des tableaux vides
    this.posts = [];
    this.filteredPosts = [];
    this.stories = [];
    
    // Vider aussi les notifications fictives
    this.notifications = [];
  }

  refreshFeed(event: any) {
    // Recharger les vrais posts au lieu des données fictives
    this.loadPosts().then(() => {
      event.target.complete();
    });
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

  async toggleLike(post: Post) {
    try {
      const userId = this.currentUser.id;
      const alreadyLiked = post.likes.some(like => like.userId === userId);
      
      // Mettre à jour l'état UI de manière optimiste
      if (alreadyLiked) {
        post.likes = post.likes.filter(like => like.userId !== userId);
        post.userLiked = false;
      } else {
        post.likes.push({ userId });
        post.userLiked = true;
        
        // Créer une notification seulement si ce n'est pas son propre post
        if (post.user.id !== this.currentUser.id && post.userId !== this.userId) {
          // Créer la notification en arrière-plan (non-bloquant)
          this.createNotification({
            type: 'like',
            postId: post.id,
            toUserId: post.userId || post.user.id.toString(),
            fromUser: this.currentUser
          }).catch(err => console.error('Background notification error:', err));
        }
      }
      
      // Sauvegarde du like dans Firebase avec gestion d'erreur améliorée
      try {
        await this.firebaseService.updateDocument('posts', post.id.toString(), {
          likes: post.likes
        });
      } catch (error: any) {
        console.error('Error updating likes:', error);
        // Restaurer l'état précédent en cas d'erreur
        if (!alreadyLiked) {
          post.likes = post.likes.filter(like => like.userId !== userId);
          post.userLiked = false;
          this.showToast('Impossible d\'ajouter votre j\'aime. Veuillez réessayer.', 'danger');
        } else {
          post.likes.push({ userId });
          post.userLiked = true;
          this.showToast('Impossible de retirer votre j\'aime. Veuillez réessayer.', 'danger');
        }
      }
    } catch (error) {
      console.error('Unexpected error in toggleLike:', error);
      this.showToast('Une erreur inattendue est survenue', 'danger');
    }
  }

  toggleComments(post: Post) {
    post.showComments = !post.showComments;
  }

  async addComment(post: Post) {
    if (!post.newComment?.trim()) return;
    
    const commentText = post.newComment.trim();
    const tempId = Math.floor(Math.random() * 1000);
    
    // Créer un commentaire avec des valeurs sanitisées
    const comment: Comment = {
      id: tempId,
      user: {
        id: this.currentUser.id,
        name: this.currentUser.name || 'Utilisateur',
        avatar: this.currentUser.avatar || 'assets/default-avatar.png',
        discipline: this.currentUser.discipline || '',
        level: this.currentUser.level || ''
      },
      text: commentText,
      timestamp: new Date(),
      likes: 0
    };
    
    // Mise à jour optimiste de l'UI
    post.comments.push(comment);
    post.newComment = '';
    
    // Créer une notification seulement si ce n'est pas son propre post (en non-bloquant)
    if (post.user.id !== this.currentUser.id && post.userId !== this.userId) {
      this.createNotification({
        type: 'comment',
        postId: post.id,
        toUserId: post.userId || post.user.id.toString(),
        fromUser: this.currentUser,
        content: comment.text
      }).catch(err => console.error('Background notification error:', err));
    }
    
    // Sauvegarde du commentaire dans Firebase avec gestion d'erreur améliorée
    try {
      await this.firebaseService.updateDocument('posts', post.id.toString(), {
        comments: post.comments
      });
    } catch (error) {
      console.error('Error updating comments:', error);
      // Restaurer l'état précédent en cas d'erreur
      post.comments = post.comments.filter(c => c.id !== tempId);
      this.showToast('Impossible d\'ajouter votre commentaire. Veuillez réessayer.', 'danger');
    }
  }

  // Ajouter une méthode pour créer une notification
  async createNotification(data: { 
    type: 'like' | 'comment', 
    postId: number, 
    toUserId: string, 
    fromUser: User,
    content?: string
  }) {
    try {
      // Sanitiser les données de l'utilisateur pour éviter les valeurs undefined
      const sanitizedFromUser = {
        id: data.fromUser.id || 0,
        name: data.fromUser.name || 'Utilisateur',
        avatar: data.fromUser.avatar || 'assets/default-avatar.png',
        // S'assurer que la discipline n'est jamais undefined
        discipline: data.fromUser.discipline || '',
        level: data.fromUser.level || ''
      };

      const notification = {
        type: data.type,
        postId: data.postId,
        fromUser: sanitizedFromUser,  // Utiliser la version sanitisée
        timestamp: new Date(),
        read: false,
        content: data.content || ''  // S'assurer que content n'est jamais undefined
      };
      
      await this.firebaseService.addNotification(data.toUserId, notification);
    } catch (error) {
      console.error('Error creating notification:', error);
      // Ne pas afficher d'erreur à l'utilisateur pour les notifications
      // car ce n'est pas critique pour l'expérience utilisateur
    }
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
    // Remove the call to showShareOptions
    // const appUrl = `appfight://post/${post.id}`;
    // this.showShareOptions(post.content, 'Publication', appUrl);
  }

  async openNotifications() {
    if (this.notifications.length === 0) {
      this.showToast('Vous n\'avez pas de notifications');
      return;
    }
    
    // Afficher une liste des notifications
    const modal = await this.modalController.create({
      component: 'NotificationsComponent',
      componentProps: {
        notifications: this.notifications
      }
    });
    
    await modal.present();
    
    // Marquer toutes les notifications comme lues
    await this.markNotificationsAsRead();
  }

  // Ajouter une méthode pour marquer les notifications comme lues
  async markNotificationsAsRead() {
    if (!this.userId || this.notifications.length === 0) return;
    
    try {
      // Mettre à jour les notifications locales
      this.notifications.forEach(n => n.read = true);
      this.unreadNotifications = 0;
      
      // Mettre à jour les notifications dans Firebase
      await this.firebaseService.markNotificationsAsRead(this.userId);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  }

  // Ajouter une méthode utilitaire pour afficher des toasts
  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color
    });
    await toast.present();
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

  async showPostOptions(post: Post) {
    // Vérifier si c'est le post de l'utilisateur actuel
    const isUserPost = post.user.id === this.currentUser.id || (post.userId === this.userId);
    
    const buttons: any[] = [ // Utilisation de any[] pour éviter les problèmes de typage
      {
        text: 'Signaler',
        icon: 'flag-outline',
        handler: () => {
          this.reportPost(post);
        }
      },
      {
        text: 'Partager',
        icon: 'share-outline',
        handler: () => {
          this.sharePost(post);
        }
      }
    ];
    
    // Ajouter l'option de suppression uniquement si c'est le post de l'utilisateur
    if (isUserPost) {
      buttons.unshift({
        text: 'Supprimer',
        role: 'destructive',
        icon: 'trash-outline',
        handler: () => {
          this.confirmDeletePost(post);
        }
      });
    }
    
    buttons.push({
      text: 'Annuler',
      icon: 'close',
      role: 'cancel'
    });
    
    const actionSheet = await this.actionSheetController.create({
      header: 'Options',
      buttons: buttons
    });
    
    await actionSheet.present();
  }
  
  // Ajout d'une méthode pour confirmer la suppression
  async confirmDeletePost(post: Post) {
    const alert = await this.alertController.create({
      header: 'Confirmer la suppression',
      message: 'Êtes-vous sûr de vouloir supprimer cette publication ? Cette action est irréversible.',
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Supprimer',
          role: 'destructive',
          handler: () => {
            this.deletePost(post);
          }
        }
      ]
    });
  
    await alert.present();
  }
  
  // Nouvelle méthode pour supprimer un post
  async deletePost(post: Post) {
    try {
      this.loading = true;
      
      // Vérifier encore une fois que c'est bien le post de l'utilisateur
      if (post.user.id !== this.currentUser.id && post.userId !== this.userId) {
        throw new Error('Vous ne pouvez pas supprimer les publications d\'autres utilisateurs');
      }
      
      // Supprimer le post de Firestore
      if (post.id) {
        await this.firebaseService.deleteDocument('posts', post.id.toString());
        
        // Supprimer le post du tableau local
        this.posts = this.posts.filter(p => p.id !== post.id);
        this.filteredPosts = this.filteredPosts.filter(p => p.id !== post.id);
        
        const toast = await this.toastController.create({
          message: 'Publication supprimée avec succès',
          duration: 2000,
          position: 'bottom'
        });
        await toast.present();
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du post:', error);
      const toast = await this.toastController.create({
        message: 'Erreur lors de la suppression de la publication',
        duration: 2000,
        position: 'bottom',
        color: 'danger'
      });
      await toast.present();
    } finally {
      this.loading = false;
    }
  }
  
  // Nouvelle méthode pour signaler un post
  async reportPost(post: Post) {
    const alert = await this.alertController.create({
      header: 'Signaler la publication',
      message: 'Pour quelle raison souhaitez-vous signaler cette publication ?',
      inputs: [
        {
          name: 'reason',
          type: 'radio',
          label: 'Contenu inapproprié',
          value: 'inappropriate',
          checked: true
        },
        {
          name: 'reason',
          type: 'radio',
          label: 'Harcèlement',
          value: 'harassment'
        },
        {
          name: 'reason',
          type: 'radio',
          label: 'Fausses informations',
          value: 'fake'
        },
        {
          name: 'reason',
          type: 'radio',
          label: 'Autre',
          value: 'other'
        }
      ],
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Signaler',
          handler: (data) => {
            this.submitReport(post, data);
          }
        }
      ]
    });
  
    await alert.present();
  }
  
  // Méthode pour soumettre un signalement
  async submitReport(post: Post, reason: string) {
    try {
      // Ici, vous pourriez enregistrer le signalement dans Firestore
      // Par exemple: await this.firebaseService.addDocument('reports', { postId: post.id, userId: this.userId, reason, timestamp: new Date() });
      
      const toast = await this.toastController.create({
        message: 'Merci pour votre signalement. Notre équipe va l\'examiner.',
        duration: 2000
      });
      await toast.present();
    } catch (error) {
      console.error('Erreur lors du signalement:', error);
      const toast = await this.toastController.create({
        message: 'Erreur lors du signalement',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
    }
  }

  registerForEvent(event: Event) {
    // Here we would open a registration form
    console.log('Registering for event', event);
  }

  // Ajouter une méthode pour charger les notifications
  async loadNotifications() {
    if (!this.userId) return;
    
    try {
      const notificationsData = await this.firebaseService.getNotifications(this.userId) as any[];
      
      if (notificationsData && notificationsData.length > 0) {
        this.notifications = notificationsData.map(notification => {
          return {
            id: notification.id,
            type: notification.type,
            postId: notification.postId,
            fromUser: notification.fromUser,
            timestamp: notification.timestamp?.toDate ? notification.timestamp.toDate() : new Date(),
            read: notification.read || false,
            content: notification.content
          };
        });
        
        // Calculer le nombre de notifications non lues
        this.unreadNotifications = this.notifications.filter(n => !n.read).length;
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }
}