import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, getDoc, getDocs, 
  addDoc, updateDoc, deleteDoc, query, where, orderBy, limit as firestoreLimit, setDoc
} from 'firebase/firestore';
import { 
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, 
  signInWithRedirect, getRedirectResult, OAuthProvider 
} from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';
import { environment } from '../../environments/environment';
import { ToastController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  app = initializeApp(environment.firebaseConfig);
  auth = getAuth(this.app);
  firestore = getFirestore(this.app);
  analytics = getAnalytics(this.app);
  googleProvider = new GoogleAuthProvider();
  appleProvider = new OAuthProvider('apple.com');

  constructor(
    private toastController: ToastController
  ) {
    console.log('Firebase initialized with project:', this.app.options.projectId);
    this.googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
    
    // Configure Apple provider with necessary scopes
    this.appleProvider.addScope('email');
    this.appleProvider.addScope('name');
  }

  // Authentication methods
  async signIn(email: string, password: string) {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  }

  async signUp(email: string, password: string) {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  }

  async signInWithGoogle() {
    try {
      // Sur mobile, utilisez signInWithRedirect au lieu de signInWithPopup
      const result = await signInWithPopup(this.auth, this.googleProvider);
      return result.user;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  }

  async signInWithApple() {
    try {
      // Sur mobile, utilisez signInWithRedirect au lieu de signInWithPopup
      const result = await signInWithPopup(this.auth, this.appleProvider);
      return result.user;
    } catch (error: any) {
      if (error.code === 'auth/operation-not-allowed') {
        alert('Apple authentication is not enabled. Please contact support.');
      }
      console.error('Error signing in with Apple:', error);
      throw error;
    }
  }

  // Ajoutez cette méthode si vous utilisez signInWithRedirect
  async getRedirectResult() {
    try {
      const result = await getRedirectResult(this.auth);
      return result?.user;
    } catch (error) {
      console.error('Error getting redirect result:', error);
      throw error;
    }
  }

  async logout() {
    try {
      await signOut(this.auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  isUserLoggedIn(): Promise<boolean> {
    return new Promise((resolve) => {
      onAuthStateChanged(this.auth, (user) => {
        resolve(!!user);
      });
    });
  }

  async getCurrentUser() {
    return new Promise((resolve, reject) => {
      onAuthStateChanged(this.auth, (user) => {
        if (user) {
          resolve(user);
        } else {
          resolve(null);
        }
      });
    });
  }

  // Firestore methods
  async getDocument(collectionName: string, docId: string) {
    try {
      const docRef = doc(this.firestore, collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting document:', error);
      throw error;
    }
  }

  async getAllDocuments(collectionName: string) {
    try {
      const querySnapshot = await getDocs(collection(this.firestore, collectionName));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting documents:', error);
      throw error;
    }
  }

  async addDocument(collectionName: string, data: any) {
    try {
      // Vérification préalable de l'authentification
      const user = await this.getCurrentUser();
      if (!user) {
        console.warn('Tentative d\'écriture sans authentification');
        await this.showErrorToast('Vous devez être connecté pour effectuer cette action');
        throw new Error('Authentication required');
      }

      const docRef = await addDoc(collection(this.firestore, collectionName), data);
      return docRef.id;
    } catch (error) {
      console.error('Error adding document:', error);

      // Gestion améliorée des erreurs de permission
      if ((error as { code: string }).code === 'permission-denied') {
        console.warn('Permission denied on collection:', collectionName);
        await this.showErrorToast('Accès refusé. Vous n\'avez pas les permissions nécessaires pour effectuer cette action.');
      } else {
        await this.showErrorToast('Une erreur est survenue lors de l\'ajout du document');
      }

      throw error;
    }
  }

  async updateDocument(collectionName: string, docId: string, data: any) {
    try {
      // Vérification préalable de l'authentification
      const user = await this.getCurrentUser();
      if (!user) {
        console.warn('Tentative d\'écriture sans authentification');
        await this.showErrorToast('Vous devez être connecté pour effectuer cette action');
        throw new Error('Authentication required');
      }

      const docRef = doc(this.firestore, collectionName, docId);
      await updateDoc(docRef, data);
      return true;
    } catch (error) {
      console.error('Error updating document:', error);
      
      if ((error as { code: string }).code === 'permission-denied') {
        console.warn('Permission denied on document:', docId, 'in collection:', collectionName);
        await this.showErrorToast('Accès refusé. Vous n\'avez pas les permissions nécessaires pour modifier ce document.');
      } else {
        await this.showErrorToast('Une erreur est survenue lors de la mise à jour du document');
      }
      
      throw error;
    }
  }

  async deleteDocument(collectionName: string, docId: string) {
    try {
      const docRef = doc(this.firestore, collectionName, docId);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  // Méthode améliorée pour récupérer tous les posts
  async getAllPosts(maxResults: number = 50) {
    try {
      // Requête pour obtenir les posts les plus récents d'abord, avec une limite
      const postsCollection = collection(this.firestore, 'posts');
      const postsQuery = query(
        postsCollection, 
        orderBy('timestamp', 'desc'), 
        firestoreLimit(maxResults)
      );
      
      const querySnapshot = await getDocs(postsQuery);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error: any) {
      console.error('Error getting posts:', error);
      
      if (error.code === 'permission-denied') {
        console.error('Permission denied. Check Firestore rules for posts collection');
        // Afficher un message à l'utilisateur sur les problèmes de permission
        await this.showErrorToast('Impossible de charger les publications. Problème de permission.');
      }
      
      // Retourner un tableau vide en cas d'erreur
      return [];
    }
  }
  
  // Méthode pour récupérer les posts d'un utilisateur spécifique
  async getUserPosts(userId: string) {
    try {
      const postsCollection = collection(this.firestore, 'posts');
      const postsQuery = query(
        postsCollection, 
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      );
      const querySnapshot = await getDocs(postsQuery);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting user posts:', error);
      return [];
    }
  }
  
  // Afficher un toast d'erreur
  async showErrorToast(message: string) {
    if (!this.toastController) return;
    
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'bottom',
      color: 'danger',
      buttons: [
        {
          text: 'OK',
          role: 'cancel'
        }
      ]
    });
    
    await toast.present();
  }

  // Méthode pour définir ou mettre à jour un document avec un ID spécifique
  async setDocument(collectionName: string, docId: string, data: any) {
    try {
      // Vérification préalable de l'authentification
      const user = await this.getCurrentUser();
      if (!user) {
        console.warn('Tentative d\'écriture sans authentification');
        await this.showErrorToast('Vous devez être connecté pour effectuer cette action');
        throw new Error('Authentication required');
      }
      
      const docRef = doc(this.firestore, collectionName, docId);
      await setDoc(docRef, data);
      return docId;
    } catch (error) {
      console.error('Error setting document:', error);
      
      if ((error as { code: string }).code === 'permission-denied') {
        console.warn('Permission denied when setting document:', docId, 'in collection:', collectionName);
        await this.showErrorToast('Accès refusé. Vous n\'avez pas les permissions nécessaires pour cette action.');
      } else {
        await this.showErrorToast('Une erreur est survenue lors de l\'enregistrement du document');
      }
      
      throw error;
    }
  }
}
