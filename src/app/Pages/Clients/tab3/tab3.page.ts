import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ActionSheetController, AlertController, ModalController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SharingService } from '../../../services/sharing.service';

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

  constructor(
    private router: Router,
    private toastController: ToastController,
    private alertController: AlertController,
    private actionSheetController: ActionSheetController,
    private modalController: ModalController,
    private sharingService: SharingService
  ) {}

  ngOnInit() {
    this.loadMockData();
    setTimeout(() => {
      this.loading = false;
      this.filteredPosts = [...this.posts];
    }, 1500);
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
        user: users[0],
        post: this.posts[1],
        timestamp: new Date(Date.now() - 1000 * 60 * 30)
      },
      {
        id: 2,
        type: 'comment',
        user: users[2],
        post: this.posts[0],
        timestamp: new Date(Date.now() - 1000 * 60 * 60)
      }
    ];
  }

  refreshFeed(event: any) {
    setTimeout(() => {
      this.loadMockData();
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

  openPostCreator(type?: string) {
    console.log('Opening post creator', type);
    // Here we would open a modal to create a post
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
    console.log('Replying to comment', comment);
    // Here we would focus the comment input and maybe add a prefix like "@username "
  }

  sharePost(post: Post) {
    post.shares++;
    this.showShareOptions(post.content, 'Publication', '');
  }

  async showShareOptions(text: string, title: string, url: string) {
    await this.sharingService.showShareOptions(title, text, url);
  }

  openNotifications() {
    console.log('Opening notifications');
    // Here we would open a notifications panel
  }

  viewProfile(userId: number) {
    console.log('Viewing profile', userId);
    // Here we would navigate to the user's profile
  }

  viewStory(story: Story) {
    console.log('Viewing story', story);
    // Here we would open a story viewer
  }

  createStory() {
    console.log('Creating story');
    // Here we would open a story creator
  }

  openMedia(media: Media) {
    console.log('Opening media', media);
    // Here we would open a media viewer
  }

  showPostOptions(post: Post) {
    console.log('Showing post options', post);
    // Here we would show a context menu
  }

  registerForEvent(event: Event) {
    console.log('Registering for event', event);
    // Here we would open a registration form
  }
}
