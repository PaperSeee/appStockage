import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { NavController, IonicModule } from '@ionic/angular';
import { SharingService } from '../../../services/sharing.service';
import { ToastController } from '@ionic/angular';
import * as ChartJS from 'chart.js';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Register Chart.js components
const Chart = ChartJS.Chart;
const registerables = ChartJS.registerables;
Chart.register(...registerables);

@Component({
  selector: 'app-session-detail',
  templateUrl: './session-detail.page.html',
  styleUrls: ['./session-detail.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule]
})
export class SessionDetailPage implements OnInit {
  @ViewChild('intensityCanvas') private intensityCanvas!: ElementRef;
  @ViewChild('progressCanvas') private progressCanvas!: ElementRef;
  
  session: any;
  intensityChart: any;
  progressChart: any;
  chartType: string = 'rounds';
  xpGained: number = 120;
  averageDuration: number = 25 * 60; // 25 minutes in seconds
  averageStrikes: number = 80;
  sessionTags: string[] = ['Technique', 'Sparring léger', 'Travail spécifique'];
  
  // Sample data for the user's progress over time
  progressData = {
    rounds: [5, 7, 6, 8, 10, 9],
    strikes: [80, 120, 110, 150, 170, 160],
    dates: ['1 Juin', '5 Juin', '10 Juin', '15 Juin', '20 Juin', '25 Juin']
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private sharingService: SharingService,
    private toastController: ToastController
  ) {
    // Receive the session data from the navigation state
    const state = this.router.getCurrentNavigation()?.extras.state;
    if (state && state['session']) {
      this.session = state['session'];
    } else {
      // No data, go back to previous page
      this.navCtrl.back();
    }
  }

  ngOnInit() {
    // Initialize mock session data if needed
    if (!this.session) {
      this.session = this.getMockSessionData();
    }
  }

  ionViewDidEnter() {
    // Create charts when the view is fully entered
    this.createCharts();
  }

  createCharts() {
    if (this.session) {
      // Create intensity distribution chart
      this.createIntensityChart();
      
      // Create progress chart
      this.createProgressChart();
    }
  }

  createIntensityChart() {
    if (this.intensityCanvas) {
      const ctx = this.intensityCanvas.nativeElement.getContext('2d');
      
      // Map intensity to a percentage value for visualization
      let intensityValue = 0;
      switch(this.session.intensity) {
        case 'low': intensityValue = 30; break;
        case 'medium': intensityValue = 65; break;
        case 'high': intensityValue = 90; break;
        default: intensityValue = 50;
      }
      
      this.intensityChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          datasets: [{
            data: [intensityValue, 100 - intensityValue],
            backgroundColor: [
              this.getIntensityColor(this.session.intensity),
              'rgba(200, 200, 200, 0.2)'
            ],
            borderWidth: 0,
            cutout: '85%',
            circumference: 240,
            rotation: 270
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              enabled: false
            }
          }
        }
      });
    }
  }

  createProgressChart() {
    if (this.progressCanvas) {
      const ctx = this.progressCanvas.nativeElement.getContext('2d');
      
      // Push current session data to the progress data
      this.progressData.rounds.push(this.session.rounds);
      this.progressData.strikes.push(this.session.strikes);
      const today = new Date();
      this.progressData.dates.push(today.getDate() + '/' + (today.getMonth() + 1));
      
      let datasets = [];
      let gradientFill;
      
      if (this.chartType === 'rounds') {
        gradientFill = ctx.createLinearGradient(0, 0, 0, 200);
        gradientFill.addColorStop(0, 'rgba(75, 192, 192, 0.2)');
        gradientFill.addColorStop(1, 'rgba(75, 192, 192, 0)');
        
        datasets.push({
          label: 'Rounds',
          data: this.progressData.rounds,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: gradientFill,
          tension: 0.4,
          fill: true
        });
      } else {
        gradientFill = ctx.createLinearGradient(0, 0, 0, 200);
        gradientFill.addColorStop(0, 'rgba(255, 99, 132, 0.2)');
        gradientFill.addColorStop(1, 'rgba(255, 99, 132, 0)');
        
        datasets.push({
          label: 'Coups',
          data: this.progressData.strikes,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: gradientFill,
          tension: 0.4,
          fill: true
        });
      }
      
      if (this.progressChart) {
        this.progressChart.destroy();
      }
      
      this.progressChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: this.progressData.dates,
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(0, 0, 0, 0.05)',
                drawBorder: false
              },
              ticks: {
                font: {
                  size: 10
                }
              }
            },
            x: {
              grid: {
                display: false
              },
              ticks: {
                font: {
                  size: 10
                }
              }
            }
          }
        }
      });
    }
  }

  updateProgressChart() {
    this.createProgressChart();
  }

  goBack() {
    this.navCtrl.back();
  }

  async shareSession() {
    const sessionType = this.getActivityLabel(this.session.activityType);
    const sessionStats = `${this.session.rounds} rounds, ${this.session.strikes} coups, ${this.session.submissions} soumissions`;
    
    try {
      const shared = await this.sharingService.share(
        'Ma séance de ' + sessionType,
        `Je viens de compléter une séance de ${sessionType} (${sessionStats})! 💪`,
        'https://appfight.com/share'
      );
      
      if (!shared) {
        this.showSharingOptions(sessionType, sessionStats);
      }
    } catch (error) {
      console.error('Error sharing session', error);
      this.showToast('Impossible de partager la séance', 'danger');
    }
  }

  private showSharingOptions(sessionType: string, sessionStats: string) {
    // Implementation for alternative sharing methods when Web Share API is not available
  }

  private async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      color: color,
      position: 'bottom'
    });
    toast.present();
  }

  getActivityLabel(type: string): string {
    switch (type) {
      case 'sparring': return 'Sparring';
      case 'bag': return 'Sac de frappe';
      case 'shadow': return 'Shadow boxing';
      case 'grappling': return 'Grappling';
      default: return 'Entraînement';
    }
  }

  formatTime(seconds: number): string {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  formatDate(timestamp: any): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getIntensityLabel(intensity: string): string {
    switch (intensity) {
      case 'low': return 'Faible';
      case 'medium': return 'Moyenne';
      case 'high': return 'Élevée';
      default: return 'Moyenne';
    }
  }
  
  getIntensityColor(intensity: string): string {
    switch (intensity) {
      case 'low': return 'rgba(76, 175, 80, 0.8)'; // Green
      case 'medium': return 'rgba(255, 193, 7, 0.8)'; // Yellow/Amber
      case 'high': return 'rgba(244, 67, 54, 0.8)'; // Red
      default: return 'rgba(255, 193, 7, 0.8)';
    }
  }
  
  // For demo purposes
  getMockSessionData() {
    return {
      id: 'mock123',
      date: new Date(),
      duration: 35 * 60, // 35 minutes in seconds
      activityType: 'sparring',
      rounds: 8,
      strikes: 145,
      submissions: 3,
      intensity: 'medium',
      location: 'Fight Club Paris',
      notes: 'Bonne séance avec travail spécifique sur les techniques de garde et contre-attaques. À revoir: blocages des low-kicks et timing des jabs.',
      sparringPartner: 'partner123',
      sparringPartnerName: 'Thomas D.'
    };
  }
}
