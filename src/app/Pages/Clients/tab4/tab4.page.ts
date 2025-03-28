import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { ExploreContainerComponentModule } from '../../../explore-container/explore-container.module';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ToastController } from '@ionic/angular';

interface Event {
  id: number;
  name: string;
  date: string;
  description: string;
  location: string;
  discipline: string;
  isOpen: boolean;
  hasCashPrize: boolean;
  isFull: boolean;
  image?: string;
}

@Component({
  selector: 'app-tab4',
  templateUrl: './tab4.page.html',
  styleUrls: ['./tab4.page.scss'],
  standalone: true,
  imports: [
    IonicModule, 
    ExploreContainerComponentModule, 
    CommonModule, 
    FormsModule,
    ReactiveFormsModule
  ]
})
export class Tab4Page implements OnInit {
  events: Event[] = [];
  filteredEvents: Event[] = [];
  loading = true;
  
  // Filter values
  tournamentType: string = 'all';
  cashPrize: string = 'all';
  discipline: string = 'all';
  
  // Modal properties
  isModalOpen = false;
  selectedEvent: Event | null = null;
  registrationForm: FormGroup;

  constructor(
    private formBuilder: FormBuilder,
    private toastController: ToastController
  ) {
    this.registrationForm = this.formBuilder.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      birthDate: ['', Validators.required],
      weightClass: ['', Validators.required],
      experienceLevel: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      termsAccepted: [false, Validators.requiredTrue]
    });
  }

  ngOnInit() {
    this.loadEvents();
  }

  loadEvents() {
    // Mock data - in a real app, this would come from an API
    this.events = [
      {
        id: 1,
        name: 'Belgian Open MMA Championship',
        date: '2023-12-15',
        description: 'Le plus grand tournoi open de MMA en Belgique. Ouvert à tous les niveaux, venez vous tester contre les meilleurs combattants du pays.',
        location: 'Bruxelles, Belgique',
        discipline: 'MMA',
        isOpen: true,
        hasCashPrize: true,
        isFull: false,
        image: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?ixlib=rb-4.0.3&auto=format&fit=crop&w=2071&q=80'
      },
      {
        id: 2,
        name: 'Antwerp Boxing Elite',
        date: '2023-11-30',
        description: 'Tournoi d\'élite sur sélection pour les boxeurs confirmés. Cash prize pour les finalistes.',
        location: 'Anvers, Belgique',
        discipline: 'Boxe',
        isOpen: false,
        hasCashPrize: true,
        isFull: false,
        image: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'
      },
      {
        id: 3,
        name: 'Charleroi Jiu-Jitsu Open',
        date: '2023-12-05',
        description: 'Tournoi amical de Jiu-Jitsu brésilien ouvert à tous les niveaux. Excellente ambiance garantie!',
        location: 'Charleroi, Belgique',
        discipline: 'Jiu-Jitsu',
        isOpen: true,
        hasCashPrize: false,
        isFull: false,
        image: 'https://images.unsplash.com/photo-1564415315949-7a0c4c73aab4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1887&q=80'
      },
      {
        id: 4,
        name: 'Gand Kickboxing Championship',
        date: '2024-01-20',
        description: 'Championnat de kickboxing avec sélections préliminaires. Les meilleures équipes de Belgique s\'affrontent.',
        location: 'Gand, Belgique',
        discipline: 'Kickboxing',
        isOpen: false,
        hasCashPrize: true,
        isFull: false,
        image: 'https://images.unsplash.com/photo-1615117972428-28de77cf06e4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'
      },
      {
        id: 5,
        name: 'Liège Muay Thai Open',
        date: '2024-02-10',
        description: 'Tournoi amical de Muay Thai pour les débutants et intermédiaires.',
        location: 'Liège, Belgique',
        discipline: 'Muay Thai',
        isOpen: true,
        hasCashPrize: false,
        isFull: true,
        image: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2069&q=80'
      }
    ];
    
    // Simulate loading delay
    setTimeout(() => {
      this.filteredEvents = [...this.events];
      this.loading = false;
    }, 1000);
  }

  applyFilters() {
    this.loading = true;
    
    setTimeout(() => {
      this.filteredEvents = this.events.filter(event => {
        // Filter by tournament type
        if (this.tournamentType !== 'all') {
          const isOpenMatch = this.tournamentType === 'open' ? event.isOpen : !event.isOpen;
          if (!isOpenMatch) return false;
        }
        
        // Filter by cash prize
        if (this.cashPrize !== 'all') {
          const hasCashPrizeMatch = this.cashPrize === 'yes' ? event.hasCashPrize : !event.hasCashPrize;
          if (!hasCashPrizeMatch) return false;
        }
        
        // Filter by discipline
        if (this.discipline !== 'all' && event.discipline.toLowerCase() !== this.discipline) {
          return false;
        }
        
        return true;
      });
      
      this.loading = false;
    }, 500);
  }

  openRegistration(event: Event) {
    this.selectedEvent = event;
    this.isModalOpen = true;
    this.registrationForm.reset({
      termsAccepted: false
    });
  }

  closeModal() {
    this.isModalOpen = false;
    this.selectedEvent = null;
  }

  async submitRegistration() {
    if (this.registrationForm.valid && this.selectedEvent) {
      // In a real app, you would send this data to your backend
      console.log('Registration submitted', {
        event: this.selectedEvent,
        participant: this.registrationForm.value
      });
      
      // Show success message
      const toast = await this.toastController.create({
        message: 'Inscription réussie! Vous recevrez une confirmation par email.',
        duration: 3000,
        position: 'bottom',
        color: 'success'
      });
      await toast.present();
      
      this.closeModal();
    } else {
      // Mark all fields as touched to show validation errors
      this.registrationForm.markAllAsTouched();
    }
  }
}
