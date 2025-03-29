import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActionSheetController, ModalController, ToastController, AlertController, IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalContentComponent } from '../../../components/modal-content/modal-content.component';

// Define interfaces for the data types
interface Training {
  id: string;
  date: string;
  duration: number;
  type: string;
  notes?: string;
}

interface Competition {
  id: string;
  name: string;
  date: string;
  location: string;
  position: number;
  notes?: string;
}

interface Goal {
  id: string;
  title: string;
  status: 'completed' | 'in-progress' | 'upcoming';
  completedDate?: string;
  dueDate?: string;
  current?: number;
  target?: number;
  progress?: number;
  unit?: string;
  badge?: string;
  badgeIcon?: string;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  hasTraining: boolean;
  hasCompetition: boolean;
  isToday: boolean;
}

interface WeeklyData {
  label: string;
  hours: number;
  percentage: number;
}

@Component({
  selector: 'app-tab5',
  templateUrl: 'tab5.page.html',
  styleUrls: ['tab5.page.scss'],
  standalone: false,
})
export class Tab5Page implements OnInit {
  @ViewChild('addTrainingModal') addTrainingModalTemplate!: TemplateRef<any>;
  @ViewChild('addCompetitionModal') addCompetitionModalTemplate!: TemplateRef<any>;

  // Forms
  trainingForm!: FormGroup;
  competitionForm!: FormGroup;

  // Statistics
  trainingStats = { count: 0, trend: 0, hours: 0, hoursTrend: 0 };
  competitionStats = { count: 0, trend: 0 };
  
  // Data collections
  weeklyData: WeeklyData[] = [];
  calendarDays: CalendarDay[] = [];
  trainings: Training[] = [];
  competitions: Competition[] = [];
  recentCompetitions: Competition[] = [];
  goals: Goal[] = [];

  // Calendar navigation
  selectedMonth: number;
  selectedYear: number;
  months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  weekdays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  constructor(
    private formBuilder: FormBuilder,
    private actionSheetController: ActionSheetController,
    private modalController: ModalController,
    private toastController: ToastController,
    private alertController: AlertController
  ) { 
    const today = new Date();
    this.selectedMonth = today.getMonth() + 1;
    this.selectedYear = today.getFullYear();
  }

  ngOnInit() {
    this.initForms();
    this.loadData();
    this.generateCalendar();
    this.calculateStats();
    this.generateWeeklyData();
  }

  // Initialize form controls
  initForms() {
    this.trainingForm = this.formBuilder.group({
      date: [new Date().toISOString(), Validators.required],
      duration: [1, [Validators.required, Validators.min(0.5)]],
      type: ['technique', Validators.required],
      notes: ['']
    });

    this.competitionForm = this.formBuilder.group({
      name: ['', Validators.required],
      date: [new Date().toISOString(), Validators.required],
      location: ['', Validators.required],
      position: [1, [Validators.required, Validators.min(1)]],
      notes: ['']
    });
  }

  // Load data from localStorage
  loadData() {
    const storedTrainings = localStorage.getItem('trainings');
    const storedCompetitions = localStorage.getItem('competitions');
    const storedGoals = localStorage.getItem('goals');

    this.trainings = storedTrainings ? JSON.parse(storedTrainings) : [];
    this.competitions = storedCompetitions ? JSON.parse(storedCompetitions) : [];
    this.goals = storedGoals ? JSON.parse(storedGoals) : [];
    
    // If no data exists, add demo data for presentation
    if (this.competitions.length === 0) {
      this.competitions = [
        {
          id: '1',
          name: 'Championnat Régional MMA',
          date: new Date('2023-06-24').toISOString(),
          location: 'Paris, France',
          position: 1,
          notes: ''
        },
        {
          id: '2',
          name: 'Tournoi Open de Boxe',
          date: new Date('2023-06-10').toISOString(),
          location: 'Lyon, France',
          position: 2,
          notes: ''
        }
      ];
      this.saveToStorage();
    }
    
    // Get recent competitions for display
    this.recentCompetitions = [...this.competitions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);
  }

  // Save all data to localStorage
  saveToStorage() {
    localStorage.setItem('trainings', JSON.stringify(this.trainings));
    localStorage.setItem('competitions', JSON.stringify(this.competitions));
    localStorage.setItem('goals', JSON.stringify(this.goals));
  }

  // Calculate statistics based on training and competition data
  calculateStats() {
    this.trainingStats.count = this.trainings.length;
    this.trainingStats.hours = this.trainings.reduce((sum, t) => sum + t.duration, 0);
    this.competitionStats.count = this.competitions.length;
    
    // Calculate trends (dummy values for now, can be improved to calculate real trends)
    this.trainingStats.trend = 12;
    this.trainingStats.hoursTrend = 8;
    this.competitionStats.trend = 0;
  }

  // Generate data for weekly chart
  generateWeeklyData() {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
    
    this.weeklyData = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      
      // Get trainings for this day
      const dayTrainings = this.trainings.filter(t => 
        new Date(t.date).toDateString() === date.toDateString()
      );
      
      // Calculate total hours
      const hours = dayTrainings.reduce((sum, t) => sum + t.duration, 0);
      
      return { 
        label: this.weekdays[i], 
        hours, 
        percentage: Math.min(hours * 20, 100) // Scale to percentage (5h = 100%)
      };
    });
  }

  // Generate calendar days for current month view
  generateCalendar() {
    const firstDay = new Date(this.selectedYear, this.selectedMonth - 1, 1);
    const lastDay = new Date(this.selectedYear, this.selectedMonth, 0);
    const firstDayOfWeek = firstDay.getDay() || 7; // 1-7 (Monday-Sunday)
    
    this.calendarDays = [];
    
    // Add days from previous month to fill first week
    const daysFromPrevMonth = firstDayOfWeek - 1;
    if (daysFromPrevMonth > 0) {
      const prevMonthLastDay = new Date(this.selectedYear, this.selectedMonth - 1, 0).getDate();
      for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
        const date = new Date(this.selectedYear, this.selectedMonth - 2, prevMonthLastDay - i);
        this.calendarDays.push({
          date,
          isCurrentMonth: false,
          hasTraining: this.checkHasTraining(date),
          hasCompetition: this.checkHasCompetition(date),
          isToday: this.isToday(date)
        });
      }
    }
    
    // Add current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(this.selectedYear, this.selectedMonth - 1, i);
      this.calendarDays.push({
        date,
        isCurrentMonth: true,
        hasTraining: this.checkHasTraining(date),
        hasCompetition: this.checkHasCompetition(date),
        isToday: this.isToday(date)
      });
    }
    
    // Add days from next month to fill remaining grid
    const totalCalendarDays = 42; // 6 rows of 7 days
    const remainingDays = totalCalendarDays - this.calendarDays.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(this.selectedYear, this.selectedMonth, i);
      this.calendarDays.push({
        date,
        isCurrentMonth: false,
        hasTraining: this.checkHasTraining(date),
        hasCompetition: this.checkHasCompetition(date),
        isToday: this.isToday(date)
      });
    }
  }

  // Helper to check if date has training
  checkHasTraining(date: Date): boolean {
    return this.trainings.some(t => {
      const trainingDate = new Date(t.date);
      return trainingDate.getDate() === date.getDate() &&
        trainingDate.getMonth() === date.getMonth() &&
        trainingDate.getFullYear() === date.getFullYear();
    });
  }

  // Helper to check if date has competition
  checkHasCompetition(date: Date): boolean {
    return this.competitions.some(c => {
      const competitionDate = new Date(c.date);
      return competitionDate.getDate() === date.getDate() &&
        competitionDate.getMonth() === date.getMonth() &&
        competitionDate.getFullYear() === date.getFullYear();
    });
  }

  // Helper to check if date is today
  isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  }

  // Calendar navigation methods
  prevMonth() {
    if (this.selectedMonth === 1) {
      this.selectedMonth = 12;
      this.selectedYear--;
    } else {
      this.selectedMonth--;
    }
    this.generateCalendar();
  }

  nextMonth() {
    if (this.selectedMonth === 12) {
      this.selectedMonth = 1;
      this.selectedYear++;
    } else {
      this.selectedMonth++;
    }
    this.generateCalendar();
  }

  changeMonth() {
    this.generateCalendar();
  }

  // Handle day selection in calendar
  selectDay(day: CalendarDay) {
    // For now, show a simple alert about the selected day
    const dateStr = day.date.toLocaleDateString('fr-FR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const message = day.hasTraining || day.hasCompetition
      ? `Vous avez ${day.hasTraining ? 'un entraînement' : ''}${day.hasTraining && day.hasCompetition ? ' et ' : ''}${day.hasCompetition ? 'une compétition' : ''} ce jour.`
      : 'Aucun événement prévu ce jour. Voulez-vous en ajouter un?';
    
    this.alertController.create({
      header: dateStr,
      message,
      buttons: [
        {
          text: 'Fermer',
          role: 'cancel'
        },
        ...(day.hasTraining || day.hasCompetition ? [] : [
          {
            text: 'Ajouter',
            handler: () => this.presentActionSheet()
          }
        ])
      ]
    }).then(alert => alert.present());
  }

  // Show settings options
  async openSettings() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Paramètres',
      buttons: [
        {
          text: 'Exporter les données',
          icon: 'download-outline',
          handler: () => {
            this.exportData();
          }
        },
        {
          text: 'Importer des données',
          icon: 'upload-outline',
          handler: () => {
            this.importData();
          }
        },
        {
          text: 'Réinitialiser les données',
          icon: 'trash-outline',
          role: 'destructive',
          handler: () => {
            this.resetData();
          }
        },
        {
          text: 'Annuler',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  // Export data as JSON file
  exportData() {
    const data = {
      trainings: this.trainings,
      competitions: this.competitions,
      goals: this.goals
    };
    
    const dataStr = JSON.stringify(data);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'evolution_data.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    this.showToast('Données exportées avec succès');
  }

  // Import data from JSON file
  async importData() {
    this.alertController.create({
      header: 'Importer des données',
      message: 'Cette action remplacera toutes vos données existantes.',
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Importer',
          handler: () => {
            // Create and trigger file input
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.json';
            fileInput.onchange = (e) => {
              const target = e.target as HTMLInputElement;
              const file = target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                  try {
                    const result = e.target?.result as string;
                    const data = JSON.parse(result);
                    
                    if (data.trainings && data.competitions && data.goals) {
                      this.trainings = data.trainings;
                      this.competitions = data.competitions;
                      this.goals = data.goals;
                      
                      this.saveToStorage();
                      this.refreshData();
                      this.showToast('Données importées avec succès');
                    } else {
                      this.showToast('Format de fichier invalide', 'danger');
                    }
                  } catch (error) {
                    this.showToast('Erreur lors de l\'importation', 'danger');
                  }
                };
                reader.readAsText(file);
              }
            };
            fileInput.click();
          }
        }
      ]
    }).then(alert => alert.present());
  }

  // Reset all data
  async resetData() {
    this.alertController.create({
      header: 'Réinitialiser les données',
      message: 'Êtes-vous sûr de vouloir supprimer toutes vos données?',
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Confirmer',
          handler: () => {
            this.trainings = [];
            this.competitions = [];
            this.goals = [];
            
            localStorage.removeItem('trainings');
            localStorage.removeItem('competitions');
            localStorage.removeItem('goals');
            
            this.refreshData();
            this.showToast('Données réinitialisées');
          }
        }
      ]
    }).then(alert => alert.present());
  }

  // Refresh all data displays
  refreshData() {
    this.calculateStats();
    this.generateWeeklyData();
    this.generateCalendar();
    this.recentCompetitions = [...this.competitions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);
  }

  // Show action sheet for adding new items
  async presentActionSheet() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Ajouter',
      buttons: [
        {
          text: 'Entraînement',
          icon: 'fitness-outline',
          handler: () => {
            this.addTraining();
          }
        },
        {
          text: 'Compétition',
          icon: 'trophy-outline',
          handler: () => {
            this.addCompetition();
          }
        },
        {
          text: 'Objectif',
          icon: 'flag-outline',
          handler: () => {
            this.addGoal();
          }
        },
        {
          text: 'Annuler',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  // Filter weekly data by training type
  async filterWeeklyData() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Filtrer par type',
      buttons: [
        {
          text: 'Tous les types',
          handler: () => {
            this.generateWeeklyData();
          }
        },
        {
          text: 'Cardio',
          handler: () => {
            this.filterWeeklyDataByType('cardio');
          }
        },
        {
          text: 'Musculation',
          handler: () => {
            this.filterWeeklyDataByType('strength');
          }
        },
        {
          text: 'Technique',
          handler: () => {
            this.filterWeeklyDataByType('technique');
          }
        },
        {
          text: 'Sparring',
          handler: () => {
            this.filterWeeklyDataByType('sparring');
          }
        },
        {
          text: 'Annuler',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  // Apply filter to weekly data by training type
  filterWeeklyDataByType(type: string) {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
    
    this.weeklyData = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      
      // Get trainings for this day with the specific type
      const dayTrainings = this.trainings.filter(t => 
        new Date(t.date).toDateString() === date.toDateString() &&
        t.type === type
      );
      
      // Calculate total hours
      const hours = dayTrainings.reduce((sum, t) => sum + t.duration, 0);
      
      return { 
        label: this.weekdays[i], 
        hours, 
        percentage: Math.min(hours * 20, 100) // Scale to percentage (5h = 100%)
      };
    });
  }

  // Add a new training
  async addTraining() {
    // Reset form to default values
    this.trainingForm.reset({
      date: new Date().toISOString(),
      duration: 1,
      type: 'technique',
      notes: ''
    });
    
    // Create and show the modal
    const modal = await this.modalController.create({
      component: ModalContentComponent,
      componentProps: {
        contentTemplate: this.addTrainingModalTemplate,
        formGroup: this.trainingForm
      }
    });
    
    await modal.present();
    
    const { data } = await modal.onDidDismiss();
    if (data?.saved) {
      this.refreshData();
      this.showToast('Entraînement ajouté');
    }
  }

  // Add a new competition
  async addCompetition() {
    // Reset form to default values
    this.competitionForm.reset({
      name: '',
      date: new Date().toISOString(),
      location: '',
      position: 1,
      notes: ''
    });
    
    // Create and show the modal
    const modal = await this.modalController.create({
      component: ModalContentComponent,
      componentProps: {
        contentTemplate: this.addCompetitionModalTemplate,
        formGroup: this.competitionForm
      }
    });
    
    await modal.present();
    
    const { data } = await modal.onDidDismiss();
    if (data?.saved) {
      this.refreshData();
      this.showToast('Compétition ajoutée');
    }
  }

  // Add a new goal
  async addGoal() {
    const alert = await this.alertController.create({
      header: 'Ajouter un objectif',
      inputs: [
        {
          name: 'title',
          type: 'text',
          placeholder: 'Titre de l\'objectif',
          value: ''
        },
        {
          name: 'target',
          type: 'number',
          placeholder: 'Objectif (nombre)',
          min: 1,
          value: 10
        },
        {
          name: 'unit',
          type: 'text',
          placeholder: 'Unité (ex: heures, séances...)',
          value: ''
        }
      ],
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Ajouter',
          handler: (data) => {
            // Validate inputs
            if (!data.title || !data.target) {
              this.showToast('Veuillez remplir tous les champs requis', 'warning');
              return;
            }
            
            // Create new goal
            const newGoal: Goal = {
              id: Date.now().toString(),
              title: data.title,
              status: 'upcoming',
              target: parseInt(data.target),
              current: 0,
              progress: 0,
              unit: data.unit,
              dueDate: new Date(Date.now() + 30*24*60*60*1000).toISOString() // 30 days from now
            };
            
            this.goals.push(newGoal);
            this.saveToStorage();
            this.showToast('Objectif ajouté');
          }
        }
      ]
    });
    
    await alert.present();
  }

  // View all competitions
  viewAllCompetitions() {
    if (this.competitions.length === 0) {
      this.showToast('Aucune compétition à afficher');
      return;
    }
    
    // Create a formatted list of competitions
    let message = '';
    [...this.competitions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .forEach((comp, index) => {
        const date = new Date(comp.date).toLocaleDateString('fr-FR');
        message += `<b>${comp.name}</b><br>`;
        message += `${date} - ${comp.location}<br>`;
        message += `Position: ${comp.position}${comp.position === 1 ? 'er' : 'ème'}<br>`;
        if (comp.notes) message += `Notes: ${comp.notes}<br>`;
        if (index < this.competitions.length - 1) message += '<br>';
      });
    
    this.alertController.create({
      header: 'Toutes les compétitions',
      message,
      buttons: ['Fermer']
    }).then(alert => alert.present());
  }

  // View all goals
  viewAllGoals() {
    if (this.goals.length === 0) {
      this.showToast('Aucun objectif à afficher');
      return;
    }
    
    // Create a formatted list of goals
    let message = '';
    this.goals.forEach((goal, index) => {
      const statusText = 
        goal.status === 'completed' ? 'Accompli' : 
        goal.status === 'in-progress' ? 'En cours' : 
        'À venir';
      
      message += `<b>${goal.title}</b><br>`;
      message += `Statut: ${statusText}<br>`;
      
      if (goal.status === 'completed' && goal.completedDate) {
        message += `Accompli le: ${new Date(goal.completedDate).toLocaleDateString('fr-FR')}<br>`;
      } else {
        message += `Progression: ${goal.current || 0}/${goal.target} ${goal.unit || ''}<br>`;
        if (goal.dueDate) {
          message += `Échéance: ${new Date(goal.dueDate).toLocaleDateString('fr-FR')}<br>`;
        }
      }
      
      if (index < this.goals.length - 1) message += '<br>';
    });
    
    this.alertController.create({
      header: 'Tous les objectifs',
      message,
      buttons: ['Fermer']
    }).then(alert => alert.present());
  }

  // Dismiss modal
  dismissModal() {
    this.modalController.dismiss({
      saved: false
    });
  }

  // Save training from form
  saveTraining() {
    if (this.trainingForm.valid) {
      const formValue = this.trainingForm.value;
      
      const newTraining: Training = {
        id: Date.now().toString(),
        date: formValue.date,
        duration: formValue.duration,
        type: formValue.type,
        notes: formValue.notes
      };
      
      this.trainings.push(newTraining);
      this.saveToStorage();
      
      this.modalController.dismiss({
        saved: true
      });
    } else {
      this.showToast('Veuillez remplir tous les champs correctement', 'warning');
    }
  }

  // Save competition from form
  saveCompetition() {
    if (this.competitionForm.valid) {
      const formValue = this.competitionForm.value;
      
      const newCompetition: Competition = {
        id: Date.now().toString(),
        name: formValue.name,
        date: formValue.date,
        location: formValue.location,
        position: formValue.position,
        notes: formValue.notes
      };
      
      this.competitions.push(newCompetition);
      this.saveToStorage();
      
      this.modalController.dismiss({
        saved: true
      });
    } else {
      this.showToast('Veuillez remplir tous les champs correctement', 'warning');
    }
  }

  // Display toast message
  async showToast(message: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
