import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { StorageService } from './storage.service';
import { take } from 'rxjs/operators';

export interface Training {
  id: string;
  date: string;
  duration: number;
  type: string;
  notes?: string;
}

export interface TrainingStats {
  count: number;
  trend: number;
  hours: number;
  hoursTrend: number;
  intensity?: number;
}

@Injectable({
  providedIn: 'root'
})
export class TrainingDataService {
  private trainingsSubject = new BehaviorSubject<Training[]>([]);
  private statsSubject = new BehaviorSubject<TrainingStats>({
    count: 0,
    trend: 0,
    hours: 0,
    hoursTrend: 0,
    intensity: 0
  });

  public trainings$: Observable<Training[]> = this.trainingsSubject.asObservable();
  public stats$: Observable<TrainingStats> = this.statsSubject.asObservable();

  constructor(private storageService: StorageService) {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    this.storageService.getItems<Training>('trainings').pipe(take(1)).subscribe(trainings => {
      if (trainings && trainings.length > 0) {
        this.trainingsSubject.next(trainings);
        this.recalculateStats(trainings);
      }
    });
  }

  setTrainings(trainings: Training[]) {
    this.trainingsSubject.next(trainings);
    this.recalculateStats(trainings);
    this.storageService.setItem('trainings', trainings).subscribe();
  }

  updateStats(stats: TrainingStats) {
    this.statsSubject.next(stats);
  }

  private recalculateStats(trainings: Training[]) {
    const stats = this.statsSubject.getValue();
    
    stats.count = trainings.length;
    stats.hours = trainings.reduce((sum, t) => sum + t.duration, 0) / 60; // Convert minutes to hours
    
    // Calculate intensity (average on a scale of 1-5)
    // Assume type affects intensity: 'cardio' and 'sparring' are more intense
    let totalIntensity = 0;
    trainings.forEach(training => {
      let intensity = 3; // Default
      switch(training.type.toLowerCase()) {
        case 'cardio': intensity = 4; break;
        case 'sparring': intensity = 5; break;
        case 'technique': intensity = 3; break;
        case 'strength': intensity = 4; break;
        default: intensity = 3;
      }
      totalIntensity += intensity;
    });
    
    stats.intensity = trainings.length ? +(totalIntensity / trainings.length).toFixed(1) : 0;
    
    this.statsSubject.next(stats);
  }

  getTrainings(): Training[] {
    return this.trainingsSubject.getValue();
  }

  getStats(): TrainingStats {
    return this.statsSubject.getValue();
  }
}
