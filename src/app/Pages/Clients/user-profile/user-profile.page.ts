import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController, ModalController, AlertController } from '@ionic/angular';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Activity {
  id: string;
  type: string;
  title: string;
  date: Date;
  duration: number;
  image: string;
  likes: number;
  comments: number;
}

interface UserProfile {
  id: string;
  name: string;
  username: string;
  avatar: string;
  coverPhoto: string;
  bio: string;
  location: string;
  discipline: string;
  level: string;
  joinDate: string;
  stats: {
    followers: number;
    following: number;
    trainingSessions: number;
    totalHours: number;
  }
}

interface ProfileItem {
  id: string;
  name: string;
  avatar: string;
  discipline: string;
}

interface Club {
  id: string;
  name: string;
  logo: string;
  members: number;
}

interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  date: Date;
}

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.page.html',
  styleUrls: ['./user-profile.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class UserProfilePage implements OnInit {
  userId: string = '';
  selectedSegment: string = 'activity';
  isCurrentUser: boolean = false;
  isFollowing: boolean = false;
  
  user: UserProfile = {
    id: '',
    name: '',
    username: '',
    avatar: '',
    coverPhoto: '',
    bio: '',
    location: '',
    discipline: '',
    level: '',
    joinDate: '',
    stats: {
      followers: 0,
      following: 0,
      trainingSessions: 0,
      totalHours: 0
    }
  };
  
  activities: Activity[] = [];
  followers: ProfileItem[] = [];
  following: ProfileItem[] = [];
  clubs: Club[] = [];
  badges: Badge[] = [];
  
  constructor(
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.userId = id;
      this.loadUserProfile();
    }
  }

  loadUserProfile() {
    // In a real app, this would fetch data from your service
    // Simulate loading data
    setTimeout(() => {
      this.user = {
        id: this.userId,
        name: 'Fighter Example',
        username: 'fighter_example',
        avatar: 'assets/par défaut.jpg',
        coverPhoto: 'assets/cover-default.jpg',
        bio: 'Passionate MMA enthusiast training 4x per week',
        location: 'Paris, France',
        discipline: 'MMA, Jiu-Jitsu',
        level: 'Intermédiaire',
        joinDate: '2023-01-15',
        stats: {
          followers: 125,
          following: 87,
          trainingSessions: 42,
          totalHours: 84
        }
      };
      
      this.loadActivities();
      this.loadFollowers();
      this.loadFollowing();
      this.loadClubs();
      this.loadBadges();
      
      // Check if this is the current user
      // In a real app, compare with current authenticated user
      this.isCurrentUser = false;
      
      // Check if already following
      this.isFollowing = Math.random() > 0.5;
    }, 500);
  }

  loadActivities() {
    // Simulate loading activities
    this.activities = Array(5).fill(0).map((_, i) => ({
      id: `activity-${i}`,
      type: i % 2 === 0 ? 'Entraînement' : 'Sparring',
      title: `Séance de ${i % 2 === 0 ? 'MMA' : 'Boxe'}`,
      date: new Date(Date.now() - i * 86400000 * 2),
      duration: 60 + i * 15,
      image: 'assets/training-default.jpg',
      likes: Math.floor(Math.random() * 20),
      comments: Math.floor(Math.random() * 10)
    }));
  }

  loadFollowers() {
    this.followers = Array(5).fill(0).map((_, i) => ({
      id: `follower-${i}`,
      name: `Follower ${i+1}`,
      avatar: 'assets/par défaut.jpg',
      discipline: i % 2 === 0 ? 'MMA' : 'Boxe'
    }));
  }

  loadFollowing() {
    this.following = Array(5).fill(0).map((_, i) => ({
      id: `following-${i}`,
      name: `Following ${i+1}`,
      avatar: 'assets/par défaut.jpg',
      discipline: i % 3 === 0 ? 'MMA' : i % 3 === 1 ? 'Boxe' : 'Jiu-Jitsu'
    }));
  }

  loadClubs() {
    this.clubs = Array(3).fill(0).map((_, i) => ({
      id: `club-${i}`,
      name: `Club ${i+1}`,
      logo: 'assets/club-default.jpg',
      members: 10 + i * 5
    }));
  }

  loadBadges() {
    this.badges = Array(4).fill(0).map((_, i) => ({
      id: `badge-${i}`,
      name: `Badge ${i+1}`,
      icon: 'trophy',
      description: `Réussite ${i+1}`,
      date: new Date(Date.now() - i * 86400000 * 7)
    }));
  }

  segmentChanged(event: CustomEvent) {
    this.selectedSegment = event.detail.value;
  }

  goBack() {
    this.navCtrl.back();
  }

  async toggleFollow() {
    if (this.isFollowing) {
      const alert = await this.alertCtrl.create({
        header: 'Se désabonner',
        message: `Voulez-vous vraiment vous désabonner de ${this.user.name}?`,
        buttons: [
          {
            text: 'Annuler',
            role: 'cancel'
          },
          {
            text: 'Désabonner',
            handler: () => {
              this.isFollowing = false;
              this.user.stats.followers--;
            }
          }
        ]
      });
      await alert.present();
    } else {
      this.isFollowing = true;
      this.user.stats.followers++;
    }
  }

  async messageUser() {
    // In a real app, navigate to chat or open chat modal
    const alert = await this.alertCtrl.create({
      header: 'Message',
      message: `Fonctionnalité de messagerie à implémenter`,
      buttons: ['OK']
    });
    await alert.present();
  }
  
  editProfile() {
    // Navigate to edit profile page
    this.navCtrl.navigateForward('/profile');
  }

  viewAllFollowers() {
    // Navigate to followers list
    console.log('View all followers');
  }

  viewAllFollowing() {
    // Navigate to following list
    console.log('View all following');
  }

  viewActivityDetails(activity: Activity) {
    // Navigate to activity details
    console.log('View activity details', activity);
  }

  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  }
}
