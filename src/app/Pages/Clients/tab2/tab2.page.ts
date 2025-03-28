import { Component, OnInit } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';

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
  // Mock data for partners
  partners: Partner[] = [
    {
      id: 1,
      name: 'Thomas',
      age: 28,
      gender: 'homme',
      photo: 'https://images.unsplash.com/photo-1594825817885-7064a90503db?q=80&w=1000&auto=format&fit=crop',
      bio: 'Passionné de boxe anglaise depuis 5 ans. Cherche des sparrings techniques pour progresser.',
      level: 'Intermédiaire',
      mainDiscipline: 'Boxe',
      disciplines: ['Boxe', 'MMA'],
      distance: 3,
      city: 'Paris'
    },
    {
      id: 2,
      name: 'Sophie',
      age: 24,
      gender: 'femme',
      photo: 'https://images.unsplash.com/photo-1592588253459-d604d617e740?q=80&w=1000&auto=format&fit=crop',
      bio: 'Pratiquante de BJJ depuis 2 ans. Ceinture bleue. Je cherche des partenaires pour des rolls techniques.',
      level: 'Intermédiaire',
      mainDiscipline: 'Jiu-jitsu',
      disciplines: ['Jiu-jitsu', 'MMA'],
      distance: 5,
      city: 'Lyon'
    },
    {
      id: 3,
      name: 'Mathieu',
      age: 32,
      gender: 'homme',
      photo: 'https://images.unsplash.com/photo-1575535340302-d9241bea2e54?q=80&w=1000&auto=format&fit=crop',
      bio: 'Champion régional de Muay Thai. Disponible pour des sparrings techniques ou intensifs.',
      level: 'Avancé',
      mainDiscipline: 'Muay Thai',
      disciplines: ['Muay Thai', 'Boxe', 'K1'],
      distance: 8,
      city: 'Marseille'
    },
    {
      id: 4,
      name: 'Emma',
      age: 26,
      gender: 'femme',
      photo: 'https://images.unsplash.com/photo-1588280991458-d759882787cf?q=80&w=1000&auto=format&fit=crop',
      bio: 'Débutante en MMA, je cherche à progresser dans tous les domaines avec des partenaires patients.',
      level: 'Débutant',
      mainDiscipline: 'MMA',
      disciplines: ['MMA', 'Boxe'],
      distance: 2,
      city: 'Bordeaux'
    },
    {
      id: 5,
      name: 'Alexandre',
      age: 30,
      gender: 'homme',
      photo: 'https://images.unsplash.com/photo-1554344728-77cf90d9ed26?q=80&w=1000&auto=format&fit=crop',
      bio: 'Judoka reconverti au BJJ. Je recherche des échanges techniques et des sparrings légers.',
      level: 'Intermédiaire',
      mainDiscipline: 'Judo',
      disciplines: ['Judo', 'Jiu-jitsu'],
      distance: 10,
      city: 'Lille'
    }
  ];

  filteredPartners: Partner[] = [];
  currentPartnerIndex = 0;
  isFilterModalOpen = false;

  filters: Filters = {
    discipline: [],
    level: '',
    gender: 'tous',
    distance: 50
  };

  constructor(
    private toastController: ToastController,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    // Initialize filtered partners with all partners
    this.applyFilters();
  }

  openFilters() {
    this.isFilterModalOpen = true;
  }

  closeFilters() {
    this.isFilterModalOpen = false;
  }

  applyFilters() {
    this.filteredPartners = this.partners.filter(partner => {
      // Filter by gender
      if (this.filters.gender !== 'tous' && partner.gender !== this.filters.gender) {
        return false;
      }

      // Filter by level
      if (this.filters.level && partner.level.toLowerCase() !== this.filters.level) {
        return false;
      }

      // Filter by discipline
      if (this.filters.discipline && this.filters.discipline.length > 0) {
        const hasMatchingDiscipline = partner.disciplines.some(d => 
          this.filters.discipline.includes(d.toLowerCase())
        );
        if (!hasMatchingDiscipline) {
          return false;
        }
      }

      // Filter by distance
      if (partner.distance > this.filters.distance) {
        return false;
      }

      return true;
    });

    this.currentPartnerIndex = 0;
    this.closeFilters();
  }

  swipeLeft() {
    // Pass action
    if (this.currentPartnerIndex < this.filteredPartners.length - 1) {
      this.currentPartnerIndex++;
    } else {
      // No more partners available
      this.filteredPartners = [];
    }
  }

  async sendMessage(partner: Partner) {
    // In a real app, this would open a chat window with the partner
    const toast = await this.toastController.create({
      message: `Message envoyé à ${partner.name}`,
      duration: 2000,
      position: 'bottom',
      color: 'success'
    });
    toast.present();
    
    // Proceed to the next profile
    if (this.currentPartnerIndex < this.filteredPartners.length - 1) {
      this.currentPartnerIndex++;
    } else {
      // No more partners available
      this.filteredPartners = [];
    }
  }

  swipeRight(partner: Partner) {
    // Like action - in a real app, this would send a match request
    console.log('Matched with:', partner.name);
    // For now, just proceed to the next profile
    if (this.currentPartnerIndex < this.filteredPartners.length - 1) {
      this.currentPartnerIndex++;
    } else {
      // No more partners available
      this.filteredPartners = [];
    }
  }

  // Method to safely set the background image
  getSafeBackground(photoUrl: string): SafeStyle {
    // Check if the URL is valid
    if (!photoUrl || photoUrl.trim() === '') {
      photoUrl = 'https://ionicframework.com/docs/img/demos/card-media.png'; // Default image
    }
    
    // Create the CSS value and sanitize it
    const style = `url(${photoUrl}) center center / cover no-repeat`;
    return this.sanitizer.bypassSecurityTrustStyle(style);
  }
}
