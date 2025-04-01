import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { FirebaseService } from './firebase.service';

@Injectable({
  providedIn: 'root'
})
export class FriendsService {
  private friendsUpdatedSource = new Subject<void>();
  
  // Observable que les composants peuvent observer
  friendsUpdated$ = this.friendsUpdatedSource.asObservable();
  
  constructor(private firebaseService: FirebaseService) {}
  
  // Méthode pour signaler que les amis ont été mis à jour
  notifyFriendsUpdated() {
    this.friendsUpdatedSource.next();
  }
  
  // Méthode pour ajouter un ami avec notification
  async addFriend(userId: string, friendData: any) {
    try {
      const result = await this.firebaseService.addFriend(userId, friendData);
      // Notifier que les amis ont été mis à jour
      this.notifyFriendsUpdated();
      return result;
    } catch (error) {
      console.error('Error adding friend in FriendsService:', error);
      throw error;
    }
  }
  
  // Méthode pour supprimer un ami avec notification
  async removeFriend(userId: string, friendId: string) {
    try {
      const result = await this.firebaseService.removeFriend(userId, friendId);
      // Notifier que les amis ont été mis à jour
      this.notifyFriendsUpdated();
      return result;
    } catch (error) {
      console.error('Error removing friend in FriendsService:', error);
      throw error;
    }
  }
  
  // Méthode pour obtenir la liste des amis
  async getFriends(userId: string) {
    return this.firebaseService.getFriends(userId);
  }
}
