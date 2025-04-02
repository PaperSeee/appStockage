import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActionSheetController, ToastController, ModalController, AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { FirebaseService } from '../../../services/firebase.service';
import { Subscription, interval } from 'rxjs';
import { SharingService } from '../../../services/sharing.service';

// Define interfaces for data models
interface TrainingSession {
  id: string;
  date: Date;
  duration: number;
  activityType: string;
  rounds: number;
  strikes: number;
  submissions: number;
  intensity: string;
  location: string;
  notes?: string;
  sparringPartnerId?: string;
  shareWithPartner?: boolean;
}

interface SparringPartner {
  id: string;
  name: string;
}

interface Challenge {
  id: string;
  name: string;
  progress: number;
  target: number;
  type: string;
}

@Component({
  selector: 'app-tab5',
  templateUrl: './tab5.page.html',
  styleUrls: ['./tab5.page.scss'],
  standalone: false  // Explicitly specify this is not a standalone component
})
export class Tab5Page implements OnInit, OnDestroy {
  // Session state
  isSessionActive: boolean = false;
  isPaused: boolean = false;
  sessionTimer: number = 0;
  sessionDuration: number = 0;
  timerSubscription: Subscription | null = null;
  startTime: Date = new Date();
  
  // Form state
  showSessionForm: boolean = false;
  sessionForm!: FormGroup;
  
  // Feedback state
  showFeedback: boolean = false;
  xpGained: number = 0;
  lastSession!: TrainingSession;
  
  // Sparring partners
  hasSparringPartners: boolean = false;
  sparringPartners: SparringPartner[] = [];
  
  // Recent sessions history
  recentSessions: TrainingSession[] = [];
  
  // Challenges
  currentChallenges: Challenge[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private actionSheetController: ActionSheetController,
    private toastController: ToastController,
    private modalController: ModalController,
    private alertController: AlertController,
    private firebaseService: FirebaseService,
    private router: Router,
    private sharingService: SharingService
  ) {
    this.initForm();
  }

  ngOnInit() {
    this.loadSparringPartners();
    this.loadRecentSessions();
    this.loadChallenges();
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  // Navigation methods
  async goToProfile() {
    const isLoggedIn = await this.firebaseService.isUserLoggedIn();
    
    if (isLoggedIn) {
      this.router.navigate(['/profile']);
    } else {
      this.router.navigate(['/login']);
    }
  }

  openSettings() {
    // Implementation for settings would go here
    this.showToast('Paramètres bientôt disponibles');
  }

  // Initialize the session form
  initForm() {
    this.sessionForm = this.formBuilder.group({
      activityType: ['sparring', Validators.required],
      rounds: [3, [Validators.required, Validators.min(0), Validators.max(20)]],
      strikes: [0, [Validators.min(0)]],
      submissions: [0, [Validators.required, Validators.min(0)]],
      intensity: ['medium', Validators.required],
      location: ['', Validators.required],
      notes: [''],
      sparringPartner: [''],
      shareWithPartner: [false]
    });
  }

  // Timer functions
  startSession() {
    this.isSessionActive = true;
    this.isPaused = false;
    this.sessionTimer = 0;
    this.startTime = new Date();
    this.startTimer();
  }

  pauseSession() {
    this.isPaused = true;
    this.stopTimer();
  }

  resumeSession() {
    this.isPaused = false;
    this.startTimer();
  }

  stopSession() {
    this.stopTimer();
    this.sessionDuration = this.sessionTimer;
    this.isSessionActive = false;
    this.showSessionForm = true;
  }

  private startTimer() {
    this.timerSubscription = interval(1000).subscribe(() => {
      this.sessionTimer++;
    });
  }

  private stopTimer() {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
      this.timerSubscription = null;
    }
  }

  // Form manipulation functions
  showManualEntry() {
    this.showSessionForm = true;
    this.sessionDuration = 0;
  }

  incrementRounds() {
    const roundsControl = this.sessionForm.get('rounds');
    if (roundsControl) {
      const currentValue = roundsControl.value;
      if (currentValue < 20) {
        this.sessionForm.patchValue({ rounds: currentValue + 1 });
      }
    }
  }

  decrementRounds() {
    const roundsControl = this.sessionForm.get('rounds');
    if (roundsControl) {
      const currentValue = roundsControl.value;
      if (currentValue > 0) {
        this.sessionForm.patchValue({ rounds: currentValue - 1 });
      }
    }
  }

  setStrikes(value: number) {
    this.sessionForm.patchValue({ strikes: value });
  }

  async getCurrentLocation() {
    try {
      // In a real app, you would use Geolocation API
      // For simplicity, we just set a mock location
      const location = 'Dojo Paris 10';
      this.sessionForm.patchValue({ location });
      
      this.showToast('Position actuelle utilisée');
    } catch (error) {
      console.error('Error getting location', error);
      this.showToast('Impossible d\'obtenir la position actuelle', 'danger');
    }
  }

  // Session saving and feedback
  async saveSession() {
    if (!this.sessionForm.valid) {
      this.showToast('Veuillez remplir tous les champs requis', 'warning');
      return;
    }

    const formData = this.sessionForm.value;
    
    // Create session object
    this.lastSession = {
      id: Date.now().toString(),
      date: new Date(),
      duration: this.sessionDuration || 30, // Default to 30 minutes if manual entry
      activityType: formData.activityType,
      rounds: formData.rounds,
      strikes: formData.strikes,
      submissions: formData.submissions,
      intensity: formData.intensity,
      location: formData.location,
      notes: formData.notes,
      sparringPartnerId: formData.sparringPartner,
      shareWithPartner: formData.shareWithPartner
    };

    try {
      // Save session to database or storage
      await this.saveSessionToStorage(this.lastSession);
      
      // Calculate XP gained
      this.calculateXpGained();
      
      // Update challenges
      this.updateChallenges();
      
      // Show feedback
      this.showSessionForm = false;
      this.showFeedback = true;
      
      // Reset form for next use
      this.sessionForm.reset({
        activityType: 'sparring',
        rounds: 3,
        strikes: 0,
        submissions: 0,
        intensity: 'medium',
        location: '',
        notes: '',
        sparringPartner: '',
        shareWithPartner: false
      });
      
      // If sharing with partner is enabled, send notification
      if (formData.shareWithPartner && formData.sparringPartner) {
        this.notifySparringPartner(formData.sparringPartner);
      }
    } catch (error) {
      console.error('Error saving session', error);
      this.showToast('Erreur lors de l\'enregistrement de la séance', 'danger');
    }
  }

  private async saveSessionToStorage(session: TrainingSession) {
    // In a real app, you would save this to Firebase or other storage
    // For now, we'll just store in localStorage
    const sessionsString = localStorage.getItem('training-sessions');
    let sessions = sessionsString ? JSON.parse(sessionsString) : [];
    sessions.unshift(session); // Add to beginning of array
    localStorage.setItem('training-sessions', JSON.stringify(sessions));
    
    // Refresh the recent sessions list
    this.loadRecentSessions();
  }

  private calculateXpGained() {
    // Simple XP calculation based on session metrics
    let xp = 0;
    
    // Base XP for activity
    xp += 50;
    
    // XP for duration (10 XP per 5 minutes)
    xp += Math.floor(this.lastSession.duration / 300) * 10;
    
    // XP for rounds (15 XP per round)
    xp += this.lastSession.rounds * 15;
    
    // XP for strikes (1 XP per 10 strikes)
    xp += Math.floor(this.lastSession.strikes / 10);
    
    // XP for submissions (20 XP per submission)
    xp += this.lastSession.submissions * 20;
    
    // Intensity multiplier
    const intensityMultiplier = this.lastSession.intensity === 'high' ? 1.5 : 
                               this.lastSession.intensity === 'medium' ? 1.2 : 1;
    
    xp = Math.floor(xp * intensityMultiplier);
    
    this.xpGained = xp;
  }

  private updateChallenges() {
    // Update progress on relevant challenges
    this.currentChallenges.forEach(challenge => {
      if (challenge.type === 'rounds') {
        challenge.progress += this.lastSession.rounds;
      } else if (challenge.type === 'submissions' && this.lastSession.submissions > 0) {
        challenge.progress += this.lastSession.submissions;
      } else if (challenge.type === 'strikes' && this.lastSession.strikes > 0) {
        challenge.progress += this.lastSession.strikes;
      }
    });
    
    // Save updated challenges
    localStorage.setItem('current-challenges', JSON.stringify(this.currentChallenges));
  }

  dismissFeedback() {
    this.showFeedback = false;
  }

  async shareSession() {
    const sessionType = this.getActivityLabel(this.lastSession.activityType);
    const sessionStats = `${this.lastSession.rounds} rounds, ${this.lastSession.strikes} coups, ${this.lastSession.submissions} soumissions`;
    
    try {
      // Use SharingService instead of Capacitor Share
      const shared = await this.sharingService.share(
        'Ma séance de ' + sessionType,
        `Je viens de compléter une séance de ${sessionType} (${sessionStats}) et j'ai gagné ${this.xpGained} XP! 💪`,
        'https://appfight.com/share'
      );
      
      if (!shared) {
        // If web share API is not available, use alternative sharing methods
        this.showSharingOptions(sessionType, sessionStats);
      }
    } catch (error) {
      console.error('Error sharing session', error);
      this.showToast('Impossible de partager la séance', 'danger');
    }
  }

  private showSharingOptions(sessionType: string, sessionStats: string) {
    // Show a list of sharing options as fallback
    this.actionSheetController.create({
      header: 'Partager sur',
      buttons: [
        {
          text: 'Facebook',
          icon: 'logo-facebook',
          handler: () => {
            this.sharingService.shareOnFacebook('https://appfight.com/share');
          }
        },
        {
          text: 'Twitter',
          icon: 'logo-twitter',
          handler: () => {
            const text = `Je viens de compléter une séance de ${sessionType} (${sessionStats}) et j'ai gagné ${this.xpGained} XP! 💪`;
            this.sharingService.shareOnTwitter(text, 'https://appfight.com/share');
          }
        },
        {
          text: 'WhatsApp',
          icon: 'logo-whatsapp',
          handler: () => {
            const text = `Je viens de compléter une séance de ${sessionType} (${sessionStats}) et j'ai gagné ${this.xpGained} XP! 💪`;
            this.sharingService.shareOnWhatsApp(text, 'https://appfight.com/share');
          }
        },
        {
          text: 'Email',
          icon: 'mail-outline',
          handler: () => {
            const subject = 'Ma séance de ' + sessionType;
            const body = `Je viens de compléter une séance de ${sessionType} (${sessionStats}) et j'ai gagné ${this.xpGained} XP! 💪\n\nhttps://appfight.com/share`;
            this.sharingService.shareByEmail(subject, body);
          }
        },
        {
          text: 'Annuler',
          icon: 'close',
          role: 'cancel'
        }
      ]
    }).then(actionSheet => actionSheet.present());
  }

  async showQuickActions() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Actions rapides',
      buttons: [
        {
          text: 'Démarrer une séance',
          icon: 'play',
          handler: () => {
            this.checkAuthAndStartSession();
          }
        },
        {
          text: 'Saisie manuelle',
          icon: 'create-outline',
          handler: () => {
            this.checkAuthAndShowManualEntry();
          }
        },
        {
          text: 'Voir mes statistiques',
          icon: 'stats-chart-outline',
          handler: () => {
            this.router.navigate(['/stats']);
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

  // Check authentication before starting session
  async checkAuthAndStartSession() {
    const isLoggedIn = await this.firebaseService.isUserLoggedIn();
    if (!isLoggedIn) {
      const alert = await this.alertController.create({
        header: 'Pas encore inscrit',
        message: 'Vous devez être connecté pour démarrer une séance.',
        buttons: [
          {
            text: 'Annuler',
            role: 'cancel'
          },
          {
            text: 'S\'inscrire',
            handler: () => {
              this.router.navigate(['/register']);
            }
          }
        ]
      });
      await alert.present();
      return;
    }
    
    // If authenticated, start the session
    this.startSession();
  }

  // Check authentication before manual entry
  async checkAuthAndShowManualEntry() {
    const isLoggedIn = await this.firebaseService.isUserLoggedIn();
    if (!isLoggedIn) {
      const alert = await this.alertController.create({
        header: 'Pas encore inscrit',
        message: 'Vous devez être connecté pour enregistrer une séance.',
        buttons: [
          {
            text: 'Annuler',
            role: 'cancel'
          },
          {
            text: 'S\'inscrire',
            handler: () => {
              this.router.navigate(['/register']);
            }
          }
        ]
      });
      await alert.present();
      return;
    }
    
    // If authenticated, show manual entry
    this.showManualEntry();
  }

  // Data loading methods
  private loadSparringPartners() {
    // In a real app, you would load this from a service
    // For now, we'll use mock data
    this.sparringPartners = [
      { id: '1', name: 'Thomas D.' },
      { id: '2', name: 'Julie M.' },
      { id: '3', name: 'Karim L.' }
    ];
    
    this.hasSparringPartners = this.sparringPartners.length > 0;
  }

  private loadRecentSessions() {
    // In a real app, you would load this from a service
    // For now, we'll load from localStorage or use mock data if not available
    const sessionsString = localStorage.getItem('training-sessions');
    
    if (sessionsString) {
      const allSessions = JSON.parse(sessionsString);
      
      // Convert string dates to Date objects
      allSessions.forEach((session: any) => {
        session.date = new Date(session.date);
      });
      
      this.recentSessions = allSessions.slice(0, 5);
    } else {
      // Mock data
      this.recentSessions = [
        {
          id: '1',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          duration: 3600, // 1 hour in seconds
          activityType: 'sparring',
          rounds: 5,
          strikes: 120,
          submissions: 2,
          intensity: 'high',
          location: 'Dojo Paris'
        },
        {
          id: '2',
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          duration: 1800, // 30 minutes in seconds
          activityType: 'bag',
          rounds: 3,
          strikes: 250,
          submissions: 0,
          intensity: 'medium',
          location: 'Fight Club Paris'
        }
      ];
    }
  }

  private loadChallenges() {
    // In a real app, you would load this from a service
    // For now, we'll load from localStorage or use mock data if not available
    const challengesString = localStorage.getItem('current-challenges');
    
    if (challengesString) {
      this.currentChallenges = JSON.parse(challengesString);
    } else {
      // Mock data
      this.currentChallenges = [
        {
          id: '1',
          name: 'Marathon de rounds',
          progress: 12,
          target: 20,
          type: 'rounds'
        },
        {
          id: '2',
          name: 'Maître de la soumission',
          progress: 3,
          target: 10,
          type: 'submissions'
        }
      ];
      
      // Save mock data to localStorage
      localStorage.setItem('current-challenges', JSON.stringify(this.currentChallenges));
    }
  }

  private async notifySparringPartner(partnerId: string) {
    // In a real app, you would send a notification through your backend
    console.log(`Notifying partner with ID ${partnerId}`);
    this.showToast('Invitation envoyée au partenaire', 'success');
  }

  // Utility methods
  viewAllSessions() {
    // Navigate to full history view
    this.router.navigate(['/sessions-history']);
  }
  
  formatTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
    } else {
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  }
  
  formatDay(date: Date): string {
    // Get day name
    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const dayName = dayNames[date.getDay()];
    
    // Get day and month
    const day = date.getDate();
    const month = date.getMonth() + 1;
    
    return `${dayName} ${day}/${month}`;
  }
  
  getActivityLabel(activityType: string): string {
    const labels: Record<string, string> = {
      'sparring': 'Sparring',
      'bag': 'Travail au sac',
      'shadow': 'Shadowboxing',
      'grappling': 'Grappling'
    };
    
    return labels[activityType] || activityType;
  }
  
  getIntensityIcon(intensity: string): string {
    const icons: Record<string, string> = {
      'low': 'battery-half-outline',
      'medium': 'battery-charging-outline',
      'high': 'flash-outline'
    };
    
    return icons[intensity] || 'pulse-outline';
  }
  
  private async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color
    });
    
    await toast.present();
  }
}
