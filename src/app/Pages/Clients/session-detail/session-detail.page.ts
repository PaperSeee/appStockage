import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { NavController, IonicModule } from '@ionic/angular';
import { SharingService } from '../../../services/sharing.service';
import { ToastController } from '@ionic/angular';
// Update the Chart.js import to avoid TypeScript errors
import * as ChartJS from 'chart.js';
import { CommonModule } from '@angular/common';

// Register Chart.js components using the new import
const Chart = ChartJS.Chart;
const registerables = ChartJS.registerables;
Chart.register(...registerables);

@Component({
  selector: 'app-session-detail',
  templateUrl: './session-detail.page.html',
  styleUrls: ['./session-detail.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class SessionDetailPage implements OnInit {
  @ViewChild('intensityCanvas') private intensityCanvas!: ElementRef; // Add ! to fix initialization error
  @ViewChild('progressCanvas') private progressCanvas!: ElementRef; // Add ! to fix initialization error
  
  session: any;
  intensityChart: any;
  progressChart: any;
  
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
          labels: ['Intensité', 'Reste'],
          datasets: [{
            data: [intensityValue, 100 - intensityValue],
            backgroundColor: [
              'rgba(54, 162, 235, 0.8)',
              'rgba(200, 200, 200, 0.2)'
            ],
            borderWidth: 0
          }]
        },
        options: {
          cutout: '75%',
          responsive: true,
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
      
      this.progressChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: this.progressData.dates,
          datasets: [
            {
              label: 'Rounds',
              data: this.progressData.rounds,
              borderColor: 'rgb(54, 162, 235)',
              backgroundColor: 'rgba(54, 162, 235, 0.2)',
              tension: 0.4,
              yAxisID: 'y'
            },
            {
              label: 'Coups',
              data: this.progressData.strikes,
              borderColor: 'rgb(255, 99, 132)',
              backgroundColor: 'rgba(255, 99, 132, 0.2)',
              tension: 0.4,
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              type: 'linear',
              display: true,
              position: 'left',
              title: {
                display: true,
                text: 'Rounds'
              }
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              title: {
                display: true,
                text: 'Coups'
              },
              grid: {
                drawOnChartArea: false
              }
            }
          }
        }
      });
    }
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
    // This could be similar to the existing showSharingOptions in tab5.page.ts
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
}
