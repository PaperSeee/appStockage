import { Component, OnInit } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';
import { FirebaseService } from '../../../services/firebase.service';

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
export class Tab2Page implements OnInit {
  // We'll keep the interface definition but not use this hardcoded data
  partners: Partner[] = [];

  filteredPartners: Partner[] = [];
  filteredUsers: any[] = []; // For Firebase users
  currentPartnerIndex = 0;
  isFilterModalOpen = false;
  loading = true; // Add loading property

  filters: Filters = {
    discipline: [],
    level: '',
    gender: 'tous',
    distance: 50
  };

  constructor(
    private toastController: ToastController,
    private sanitizer: DomSanitizer,
    private firebaseService: FirebaseService
  ) {}

  ngOnInit() {
    // Load real users from Firebase
    this.loadUsers();
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

  async sendMessage(user: any) {
    const toast = await this.toastController.create({
      message: `Message envoyé à ${this.getUserFullName(user)}`,
      duration: 2000,
      position: 'bottom',
      color: 'success'
    });
    await toast.present();
  }

  // Handle image loading errors
  handleImageError(event: any) {
    // Set a default image if loading fails
    event.target.src = 'assets/default-profile.jpg';
  }
}
