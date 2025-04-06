import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FirebaseService } from '../../../services/firebase.service';
import { AnimationController } from '@ionic/angular';

// Define the Post interface for type checking
interface Post {
  id?: string;
  user: {
    displayName: string;
    photoURL: string;
    id?: string;
  };
  content: string;
  imageUrl?: string;
  timestamp: Date;
  likes: number;
  comments: number;
  shares: number;
}

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class Tab1Page implements OnInit {
  // User data
  user = {
    displayName: 'Fighter',
    photoURL: 'assets/default-avatar.jpg',
    level: 7,
    rank: '',
    currentXP: 3200,
    nextLevelXP: 4000,
    xpProgress: 0.75,
    streak: 5
  };
  
  // Messages notification
  unreadMessageCount = 3;
  
  // Active challenges
  activeChallenges = [
    { 
      title: 'Marathon de rounds', 
      progress: 12, 
      target: 20,
      icon: 'timer-outline'
    },
    { 
      title: 'Chasseur de soumissions', 
      progress: 2, 
      target: 5,
      icon: 'trophy-outline'
    },
    { 
      title: 'Roi du cardio', 
      progress: 35, 
      target: 60,
      icon: 'heart-outline'
    }
  ];
  
  // Latest badge
  latestBadge = {
    title: 'Machine à combos',
    description: 'Enchaîne 3 techniques dans un round',
    icon: 'ribbon-outline',
    color: 'warning'
  };
  
  // Weekly stats
  weeklyStats = {
    sessions: 4,
    totalMinutes: 180,
    techniques: 12
  };
  
  // Top social posts
  topPosts: Post[] = [
    {
      user: {
        displayName: 'K.O.King',
        photoURL: 'assets/users/user1.jpg'
      },
      content: '5 rounds, 150 coups - Qui me bat ?',
      imageUrl: 'assets/posts/training1.jpg',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      likes: 24,
      comments: 8,
      shares: 2
    },
    {
      user: {
        displayName: 'JiuJitsuMaster',
        photoURL: 'assets/users/user2.jpg'
      },
      content: 'Nouvelle soumission maîtrisée aujourd\'hui ! Triangle étrangleur parfait 💪',
      imageUrl: 'assets/posts/submission1.jpg',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      likes: 42,
      comments: 15,
      shares: 5
    }
  ];
  
  // Suggested partners
  suggestedPartners = [
    {
      id: 'partner1',
      displayName: 'Mike T.',
      photoURL: 'assets/users/partner1.jpg',
      discipline: 'MMA',
      matchPercentage: 92
    },
    {
      id: 'partner2',
      displayName: 'Sarah K.',
      photoURL: 'assets/users/partner2.jpg',
      discipline: 'Muay Thai',
      matchPercentage: 85
    },
    {
      id: 'partner3',
      displayName: 'Alex B.',
      photoURL: 'assets/users/partner3.jpg',
      discipline: 'Jiu-Jitsu',
      matchPercentage: 78
    }
  ];

  // Animation states
  animateTrackBtn = false;

  constructor(
    private router: Router,
    private firebaseService: FirebaseService,
    private animationCtrl: AnimationController
  ) {}

  ngOnInit() {
    this.loadUserData();
    this.loadChallenges();
    this.loadWeeklyStats();
    this.loadSocialFeed();
    this.loadSuggestedPartners();
    
    // Start track button animation
    setTimeout(() => {
      this.animateTrackBtn = true;
    }, 1000);
  }
  
  // Start tracking a new session
  startTracking() {
    // Visual feedback on button press
    this.animateTrackBtn = false;
    setTimeout(() => {
      this.router.navigate(['/tabs/tab5']);
    }, 200);
  }
  
  // Format timestamp to relative time (e.g. "2h ago")
  timeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffDay > 0) {
      return diffDay + 'j';
    } else if (diffHour > 0) {
      return diffHour + 'h';
    } else if (diffMin > 0) {
      return diffMin + 'min';
    } else {
      return 'à l\'instant';
    }
  }
  
  // Navigate to user profile
  viewProfile(userId?: string) {
    if (userId) {
      this.router.navigate(['/tabs/user-profile', userId]);
    } else {
      this.router.navigate(['/profile']);
    }
  }
  
  // Load user data from Firebase
  async loadUserData() {
    try {
      const userData = await this.firebaseService.getCurrentUser() as any;
      if (userData) {
        // Update user object with real data
        this.user = {
          ...this.user,
          displayName: userData.displayName || this.user.displayName,
          photoURL: userData.photoURL || this.user.photoURL,
          level: userData.level || this.user.level,
          rank: userData.rank || this.user.rank,
          currentXP: userData.xp || this.user.currentXP,
          nextLevelXP: userData.nextLevelXP || this.user.nextLevelXP,
          streak: userData.streak || this.user.streak
        };
        
        // Calculate XP progress
        this.user.xpProgress = this.user.currentXP / this.user.nextLevelXP;
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }
  
  // Load active challenges
  async loadChallenges() {
    try {
      // Here you would fetch real challenges from your service
      // For now, we're using the sample data defined above
    } catch (error) {
      console.error('Error loading challenges:', error);
    }
  }
  
  // Load weekly stats
  async loadWeeklyStats() {
    try {
      // Here you would fetch real stats from your service
      // For now, we're using the sample data defined above
    } catch (error) {
      console.error('Error loading weekly stats:', error);
    }
  }
  
  // Load social feed
  async loadSocialFeed() {
    try {
      // Here you would fetch real social posts from your service
      // For now, we're using the sample data defined above
    } catch (error) {
      console.error('Error loading social feed:', error);
    }
  }
  
  // Load suggested partners
  async loadSuggestedPartners() {
    try {
      // Here you would fetch real partners suggestions from your service
      // For now, we're using the sample data defined above
    } catch (error) {
      console.error('Error loading suggested partners:', error);
    }
  }
  
  // Navigate to the messages screen
  goToMessages() {
    this.router.navigate(['/messaging']);
  }
  
  // Navigate to the challenges screen
  viewAllChallenges() {
    this.router.navigate(['/tabs/tab3']);
  }
  
  // Navigate to the social feed
  viewAllPosts() {
    this.router.navigate(['/tabs/tab3']);
  }
  
  // Navigate to the sparring partners screen
  findMorePartners() {
    this.router.navigate(['/tabs/tab2']);
  }
}
