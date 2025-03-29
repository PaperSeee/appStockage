import { Component, OnInit } from '@angular/core';
import { FirebaseService } from '../../../services/firebase.service';
import { AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { SharingService } from '../../../services/sharing.service';

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

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page implements OnInit {
  trainings: Training[] = [];
  nearbyPartners: User[] = [];
  upcomingEvents: Event[] = [];
  disciplineFilter: string = '';
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
  
  constructor(
    private firebaseService: FirebaseService,
    private alertController: AlertController,
    private router: Router,
    private sharingService: SharingService
  ) {}

  ngOnInit() {
    this.loadMockData();
    
    // Initialize filtered arrays
    this.filteredEvents = [...this.upcomingEvents];
    this.filteredPartners = [...this.nearbyPartners];
    this.filteredTrainings = [...this.trainings];
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
    const text = `Cette semaine: ${this.weeklySummary.sessions} entraînements, ${this.weeklySummary.totalMinutes} minutes, intensité ${this.weeklySummary.intensity}/5.`;
    
    this.sharingService.showShareOptions(title, text, url);
  }

  shareTraining(training: Training) {
    const url = window.location.href;
    const title = `Séance de ${training.type}: ${training.title}`;
    const text = `${training.description} - Durée: ${training.duration} min à ${training.location}`;
    
    this.sharingService.showShareOptions(title, text, url);
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
      // Si l'utilisateur n'est pas connecté, naviguer vers la page d'inscription
      this.router.navigate(['/register']);
    }
  }

  searchItems() {
    const term = this.searchTerm.toLowerCase().trim();
    
    if (!term) {
      // If search is empty, reset to original data
      this.filteredEvents = [...this.upcomingEvents];
      this.filteredPartners = [...this.nearbyPartners];
      this.filteredTrainings = [...this.trainings];
      return;
    }
    
    // Filter events
    this.filteredEvents = this.upcomingEvents.filter(event => 
      event.title.toLowerCase().includes(term) ||
      event.type.toLowerCase().includes(term) ||
      event.location.toLowerCase().includes(term)
    );
    
    // Filter partners
    this.filteredPartners = this.nearbyPartners.filter(partner => 
      partner.name.toLowerCase().includes(term) ||
      partner.discipline.toLowerCase().includes(term)
    );
    
    // Filter trainings
    this.filteredTrainings = this.trainings.filter(training => 
      training.title.toLowerCase().includes(term) ||
      training.description.toLowerCase().includes(term) ||
      training.type.toLowerCase().includes(term) ||
      training.user.name.toLowerCase().includes(term) ||
      training.location.toLowerCase().includes(term)
    );
  }
}
