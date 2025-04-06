import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, getDoc, getDocs, 
  addDoc, updateDoc, deleteDoc, query, where, orderBy, limit as firestoreLimit, setDoc, writeBatch
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

  // Ajout d'une variable pour détecter iOS
  private readonly isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  
  // Ajout d'une variable pour détecter le mode PWA
  private readonly isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                          (window.navigator as any).standalone === true;

  constructor(
    private toastController: ToastController
  ) {
    console.log('Firebase initialized with project:', this.app.options.projectId);
    this.googleProvider.setCustomParameters({
      prompt: 'select_account',
      // Paramètres spécifiques pour iOS
      ...(this.isIOS && {
        // Force la réauthentification pour contourner les problèmes de cache sur iOS
        login_hint: '',
        auth_type: 'reauthenticate'
      })
    });
    
    // Configure Apple provider with necessary scopes
    this.appleProvider.addScope('email');
    this.appleProvider.addScope('name');

    // Log le mode d'affichage et la plateforme pour le debugging
    console.log(`Running on: ${this.isIOS ? 'iOS' : 'non-iOS'}, Mode: ${this.isPWA ? 'PWA' : 'Browser'}`);
  }

  // Authentication methods
  async signIn(usernameOrEmail: string, password: string) {
    try {
      let loginEmail = usernameOrEmail;
      
      // Si l'entrée ne contient pas '@', on considère que c'est un nom d'utilisateur
      if (!usernameOrEmail.includes('@')) {
        console.log('Tentative de connexion avec nom d\'utilisateur:', usernameOrEmail);
        
        // Rechercher l'email associé au nom d'utilisateur dans Firestore
        const usersCollection = collection(this.firestore, 'users');
        const usernameQuery = query(usersCollection, where('username', '==', usernameOrEmail));
        const querySnapshot = await getDocs(usernameQuery);
        
        if (querySnapshot.empty) {
          await this.showErrorToast('Nom d\'utilisateur introuvable');
          throw new Error('username_not_found');
        }
        
        // Récupérer l'email du document utilisateur
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        loginEmail = userData['email'];
        
        if (!loginEmail) {
          await this.showErrorToast('Email associé au nom d\'utilisateur introuvable');
          throw new Error('email_not_found');
        }
        
        console.log('Email trouvé pour le nom d\'utilisateur:', loginEmail);
      }
      
      // Procéder à l'authentification avec l'email
      const userCredential = await signInWithEmailAndPassword(this.auth, loginEmail, password);
      return userCredential.user;
    } catch (error: any) {
      console.error('Erreur lors de la connexion:', error);
      
      // Afficher un message d'erreur approprié si l'erreur n'est pas déjà gérée
      if (error.message !== 'username_not_found' && error.message !== 'email_not_found') {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
          await this.showErrorToast('Email/nom d\'utilisateur ou mot de passe incorrect');
        } else if (error.code === 'auth/too-many-requests') {
          await this.showErrorToast('Trop de tentatives échouées. Veuillez réessayer plus tard.');
        } else if (error.code === 'auth/invalid-email') {
          await this.showErrorToast('Format d\'email invalide');
        } else {
          await this.showErrorToast('Erreur lors de la connexion. Veuillez réessayer.');
        }
      }
      
      throw error;
    }
  }

  async signUp(email: string, password: string) {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      return userCredential.user;
    } catch (error: any) {
      console.error('Error signing up:', error);
      
      // Provide more user-friendly error messages
      if (error.code === 'auth/email-already-in-use') {
        await this.showErrorToast('Cet email est déjà utilisé. Essayez de vous connecter.');
      } else if (error.code === 'auth/weak-password') {
        await this.showErrorToast('Le mot de passe est trop faible. Utilisez au moins 6 caractères.');
      } else if (error.code === 'auth/invalid-email') {
        await this.showErrorToast('L\'adresse email n\'est pas valide.');
      } else {
        await this.showErrorToast('Erreur lors de l\'inscription. Veuillez réessayer.');
      }
      
      throw error;
    }
  }

  async signInWithGoogle() {
    try {
      // Nettoyer le localStorage pour éviter les états incohérents
      localStorage.removeItem('pendingGoogleAuth');
      
      console.log('Using redirect for Google authentication');
      
      // Marquer qu'une authentification Google est en cours
      localStorage.setItem('pendingGoogleAuth', 'true');
      localStorage.setItem('authStartTime', Date.now().toString());
      
      // Utiliser uniquement la méthode de redirection, quel que soit l'environnement
      await signInWithRedirect(this.auth, this.googleProvider);
      return null;
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      console.error('Error details:', JSON.stringify(error));
      
      // Nettoyer l'état en attente en cas d'erreur
      localStorage.removeItem('pendingGoogleAuth');
      localStorage.removeItem('authStartTime');
      
      // Provide more user-friendly error messages
      if (error.code === 'auth/unauthorized-domain') {
        throw new Error('Le domaine n\'est pas autorisé pour l\'authentification. Veuillez contacter l\'administrateur ou essayer une autre méthode de connexion.');
      }
      
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
      console.log('Checking for redirect result...');
      
      // Vérifier s'il y avait une authentification Google en attente
      const pendingAuth = localStorage.getItem('pendingGoogleAuth');
      const authStartTime = localStorage.getItem('authStartTime');
      
      // Si nous sommes sur iOS PWA et qu'une auth était en cours
      if (this.isIOS && this.isPWA && pendingAuth === 'true') {
        console.log('Pending Google auth detected on iOS PWA');
        
        // Vérifier si l'authentification a pris trop de temps (timeout de 5 minutes)
        const startTime = parseInt(authStartTime || '0');
        const timePassed = Date.now() - startTime;
        if (timePassed > 300000) { // 5 minutes
          console.log('Auth timeout exceeded, clearing pending state');
          localStorage.removeItem('pendingGoogleAuth');
          localStorage.removeItem('authStartTime');
          return null;
        }
        
        // Vérifier directement si l'utilisateur est connecté plutôt que d'utiliser getRedirectResult
        const currentUser = this.auth.currentUser;
        if (currentUser) {
          console.log('Current user found after redirect:', currentUser.uid);
          
          // Nettoyer les marqueurs d'authentification en attente
          localStorage.removeItem('pendingGoogleAuth');
          localStorage.removeItem('authStartTime');
          
          return currentUser;
        }
      }
      
      // Approche standard pour les autres environnements
      const result = await getRedirectResult(this.auth);
      
      if (result && result.user) {
        console.log('Redirect result found:', result.user.uid);
        
        // Nettoyer les états en attente
        localStorage.removeItem('pendingGoogleAuth');
        localStorage.removeItem('authStartTime');
        
        return result.user;
      } else {
        console.log('No redirect result');
        
        // Vérifier l'utilisateur actuel comme fallback
        const currentUser = this.auth.currentUser;
        if (currentUser) {
          console.log('No redirect result, but current user found:', currentUser.uid);
          return currentUser;
        }
        
        return null;
      }
    } catch (error: any) {
      console.error('Error getting redirect result:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      // Gérer spécifiquement les erreurs de session Firebase sur iOS
      if (this.isIOS && this.isPWA && 
          (error.code === 'auth/network-request-failed' || 
           error.code === 'auth/invalid-credential')) {
        console.log('iOS PWA specific auth error, checking current user');
        
        // Récupérer l'utilisateur actuel comme fallback
        const currentUser = this.auth.currentUser;
        if (currentUser) {
          return currentUser;
        }
      }
      
      throw error;
    } finally {
      // Nettoyage dans tous les cas pour éviter les erreurs persistantes
      if (this.isIOS && this.isPWA) {
        localStorage.removeItem('pendingGoogleAuth');
        localStorage.removeItem('authStartTime');
      }
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
      // Vérifier directement l'utilisateur actuel
      if (this.auth.currentUser) {
        console.log('User is already logged in:', this.auth.currentUser.uid);
        resolve(true);
        return;
      }
      
      // Sinon, attendre le changement d'état
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
      // Ensure the user is authenticated
      const user = await this.getCurrentUser();
      if (!user && collectionName === 'users') {
        console.warn('Attempt to write to users collection without authentication');
        await this.showErrorToast('Vous devez être connecté pour effectuer cette action');
        throw new Error('Authentication required');
      }

      // Add a timestamp for tracking
      const dataWithTimestamp = {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const docRef = await addDoc(collection(this.firestore, collectionName), dataWithTimestamp);
      console.log(`Document successfully added: ${docRef.id} in ${collectionName}`);
      return docRef.id;
    } catch (error: any) {
      console.error('Error adding document:', error);

      if (error.code === 'permission-denied') {
        console.warn(`Permission denied on collection: ${collectionName}, User ID: ${(await this.getCurrentUser() as any)?.uid}`);
        if (collectionName === 'users') {
          await this.showErrorToast('Nous rencontrons un problème avec la création de votre profil, mais votre compte a été créé. Vous pouvez vous connecter.');
          return 'temporary-id'; // Allow the user to proceed
        } else {
          await this.showErrorToast('Accès refusé. Vérifiez vos permissions ou reconnectez-vous.');
        }
      } else {
        await this.showErrorToast('Une erreur est survenue lors de l\'ajout du document. Veuillez réessayer.');
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

      // Nettoyer les données pour éliminer les valeurs undefined
      const cleanData = this.sanitizeData(data);

      const docRef = doc(this.firestore, collectionName, docId);
      await updateDoc(docRef, cleanData);
      return true;
    } catch (error: any) {
      console.error('Error updating document:', error);
      
      if (error.code === 'permission-denied') {
        console.warn('Permission denied on document:', docId, 'in collection:', collectionName);
        await this.showErrorToast('Accès refusé. Vous n\'avez pas les permissions nécessaires pour modifier ce document.');
        
        // Vérifiez si l'utilisateur est toujours connecté
        const isStillLoggedIn = await this.isUserLoggedIn();
        if (!isStillLoggedIn) {
          console.warn('User session expired');
          await this.showErrorToast('Votre session a expiré. Veuillez vous reconnecter.');
        }
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
    } catch (error: any) {
      console.error('Error setting document:', error);
      
      if (error.code === 'permission-denied') {
        console.warn('Permission denied when setting document:', docId, 'in collection:', collectionName);
        await this.showErrorToast('Accès refusé. Vous n\'avez pas les permissions nécessaires pour cette action.');
      } else {
        await this.showErrorToast('Une erreur est survenue lors de l\'enregistrement du document');
      }
      
      throw error;
    }
  }

  // Méthode pour récupérer les notifications d'un utilisateur
  async getNotifications(userId: string) {
    try {
      const notificationsCollection = collection(this.firestore, `users/${userId}/notifications`);
      const notificationsQuery = query(
        notificationsCollection,
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(notificationsQuery);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting notifications:', error);
      return [];
    }
  }

  // Méthode pour ajouter une notification
  async addNotification(userId: string, notification: any) {
    try {
      // Vérifier si l'identifiant de l'utilisateur est valide
      if (!userId) {
        console.error('User ID is invalid');
        return;
      }

      // Sanitiser l'objet notification pour éviter les valeurs undefined
      const sanitizedNotification = {
        type: notification.type || 'info',
        postId: notification.postId || 0,
        fromUser: {
          id: notification.fromUser.id || 0,
          name: notification.fromUser.name || 'Utilisateur',
          avatar: notification.fromUser.avatar || 'assets/default-avatar.png',
          discipline: notification.fromUser.discipline || '',
          level: notification.fromUser.level || ''
        },
        timestamp: notification.timestamp || new Date(),
        read: notification.read || false,
        content: notification.content || ''
      };
      
      const notificationsCollection = collection(this.firestore, `users/${userId}/notifications`);
      await addDoc(notificationsCollection, sanitizedNotification);
    } catch (error) {
      console.error('Error adding notification:', error);
      // Ne pas relancer l'erreur pour éviter de perturber l'expérience utilisateur
    }
  }

  // Méthode pour marquer toutes les notifications comme lues
  async markNotificationsAsRead(userId: string) {
    try {
      const notificationsCollection = collection(this.firestore, `users/${userId}/notifications`);
      const notificationsQuery = query(
        notificationsCollection,
        where('read', '==', false)
      );
      
      const querySnapshot = await getDocs(notificationsQuery);
      const batch = writeBatch(this.firestore);
      
      querySnapshot.docs.forEach(doc => {
        const notificationRef = doc.ref;
        batch.update(notificationRef, { read: true });
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      throw error;
    }
  }

  // Nouvelle méthode utilitaire pour nettoyer les données
  private sanitizeData(data: any): any {
    // Si null ou undefined, retourner un objet vide
    if (!data) return {};
    
    // Si c'est un tableau, le parcourir et nettoyer chaque élément
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }
    
    // Si c'est un objet, parcourir ses propriétés
    if (typeof data === 'object') {
      const cleanedData: any = {};
      
      Object.keys(data).forEach(key => {
        const value = data[key];
        
        // Ne pas inclure les valeurs undefined
        if (value !== undefined) {
          // Si c'est un objet ou un tableau, récursion
          if (value !== null && typeof value === 'object') {
            cleanedData[key] = this.sanitizeData(value);
          } else {
            cleanedData[key] = value;
          }
        } else {
          // Remplacer les undefined par des valeurs par défaut selon le contexte
          if (key === 'discipline' || key === 'level' || key === 'content') {
            cleanedData[key] = '';
          } else if (key.includes('Count') || key === 'likes') {
            cleanedData[key] = 0;
          }
        }
      });
      
      return cleanedData;
    }
    
    // Pour les types primitifs, retourner tel quel
    return data;
  }

  async isUsernameAvailable(username: string, currentUserId?: string): Promise<boolean> {
    try {
      // First, try to get the current authenticated user
      const user = await this.getCurrentUser() as any;
      
      if (!user) {
        console.warn('No authenticated user when checking username availability');
        // Return true to allow registration to proceed, we'll validate again at document creation
        return true;
      }
      
      // Instead of querying all documents, we'll use a Firestore query with a where clause
      // This still requires permission to query the collection, but it's more secure
      const usersCollection = collection(this.firestore, 'users');
      const usernameQuery = query(usersCollection, where('username', '==', username));
      const querySnapshot = await getDocs(usernameQuery);
      
      // If currentUserId is provided, we check that it's not the same user
      if (currentUserId && !querySnapshot.empty) {
        // Retourne true si le seul document trouvé est celui de l'utilisateur actuel
        return querySnapshot.docs.length === 1 && 
               querySnapshot.docs[0].id === currentUserId;
      }
      
      return querySnapshot.empty;
    } catch (error) {
      console.error('Erreur lors de la vérification du nom d\'utilisateur:', error);
      
      // Si l'erreur est due à des permissions insuffisantes, on permet à l'utilisateur de continuer
      if (error instanceof Error && error.toString().includes('permission-denied')) {
        console.warn('Permissions insuffisantes pour vérifier le nom d\'utilisateur, on assume qu\'il est disponible');
        await this.showErrorToast('Impossible de vérifier si le nom d\'utilisateur existe déjà. Continuons quand même.');
        return true; // Fallback: on suppose que le nom d'utilisateur est disponible
      }
      
      // Pour les autres types d'erreurs, on les propage
      throw error;
    }
  }

  // Add a user as a friend
  async addFriend(userId: string, friendData: any) {
    try {
      const friendId = friendData.id || friendData.userId;
      if (!userId || !friendId) {
        console.error('Invalid user ID or friend ID');
        throw new Error('Invalid user or friend ID');
      }
      
      // Create a clean copy of friend data to store
      const friendToSave = {
        userId: friendId,
        photo: friendData.photo || null,
        firstName: friendData.firstName || '',
        lastName: friendData.lastName || '',
        discipline: friendData.discipline || '',
        level: friendData.level || '',
        city: friendData.city || '',
        addedAt: new Date()
      };
      
      // Use direct collection/document path methods instead of setDocument
      const friendsCollectionRef = collection(this.firestore, `users/${userId}/friends`);
      const friendDocRef = doc(friendsCollectionRef, friendId);
      await setDoc(friendDocRef, friendToSave);
      
      return friendId;
    } catch (error: any) {
      console.error('Error adding friend:', error);
      
      if (error.code === 'permission-denied') {
        await this.showErrorToast('Permission refusée: Vous ne pouvez pas ajouter cet ami. Vérifiez vos règles de sécurité Firebase.');
      } else {
        await this.showErrorToast('Une erreur est survenue lors de l\'ajout de l\'ami.');
      }
      
      throw error;
    }
  }

  // Remove a friend
  async removeFriend(userId: string, friendId: string) {
    try {
      if (!userId || !friendId) {
        console.error('Invalid user ID or friend ID');
        throw new Error('Invalid user or friend ID');
      }
      
      // Get direct reference to the friend document
      const friendDocRef = doc(this.firestore, `users/${userId}/friends/${friendId}`);
      await deleteDoc(friendDocRef);
      
      return true;
    } catch (error: any) {
      console.error('Error removing friend:', error);
      
      if (error.code === 'permission-denied') {
        await this.showErrorToast('Permission refusée: Vous ne pouvez pas supprimer cet ami. Vérifiez vos règles de sécurité Firebase.');
      } else {
        await this.showErrorToast('Une erreur est survenue lors de la suppression de l\'ami.');
      }
      
      throw error;
    }
  }

  // Get all friends of a user
  async getFriends(userId: string) {
    try {
      if (!userId) {
        console.error('Invalid user ID');
        return [];
      }
      
      // Get all documents in the friends subcollection
      const friendsCollectionRef = collection(this.firestore, `users/${userId}/friends`);
      const querySnapshot = await getDocs(friendsCollectionRef);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error(`Error getting friends for ${userId}:`, error);
      return [];
    }
  }
  
  // Add the missing getCollection method
  async getCollection(collectionPath: string) {
    try {
      const querySnapshot = await getDocs(collection(this.firestore, collectionPath));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error(`Error getting documents from ${collectionPath}:`, error);
      return [];
    }
  }
}
