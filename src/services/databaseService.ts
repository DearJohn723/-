import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Product, UserProfile } from '../types';

export const databaseService = {
  // Products
  async getProducts() {
    const productsCol = collection(db, 'products');
    const q = query(productsCol, orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      } as Product;
    });
  },

  subscribeToProducts(callback: (products: Product[]) => void) {
    const productsCol = collection(db, 'products');
    const q = query(productsCol, orderBy('updatedAt', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
      const products = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
        } as Product;
      });
      callback(products);
    }, (error) => {
      console.error("Firestore subscribeToProducts Error:", error);
    });
  },

  async addProduct(product: Partial<Product>) {
    const productsCol = collection(db, 'products');
    const { id, ...productData } = product;
    
    const dataToSave = {
      ...productData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: auth.currentUser?.uid || product.createdBy || ''
    };

    if (id) {
      await setDoc(doc(db, 'products', id), dataToSave);
      return { id, ...productData } as Product;
    } else {
      const docRef = await addDoc(productsCol, dataToSave);
      return { id: docRef.id, ...productData } as Product;
    }
  },

  async updateProduct(id: string, product: Partial<Product>) {
    const docRef = doc(db, 'products', id);
    const { id: _, ...productData } = product;
    
    const dataToUpdate = {
      ...productData,
      updatedAt: serverTimestamp()
    };

    await updateDoc(docRef, dataToUpdate);
    const updatedDoc = await getDoc(docRef);
    return { id: updatedDoc.id, ...updatedDoc.data() } as Product;
  },

  async deleteProduct(id: string) {
    await deleteDoc(doc(db, 'products', id));
  },

  async checkProductCodeUnique(productCode: string, excludeId?: string) {
    const productsCol = collection(db, 'products');
    const q = query(productsCol, where('productCode', '==', productCode));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return true;
    if (excludeId && snapshot.docs.length === 1 && snapshot.docs[0].id === excludeId) return true;
    
    return false;
  },

  // Users
  async getUserProfile(uid: string) {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  },

  async getUserProfileByEmail(email: string) {
    const usersCol = collection(db, 'users');
    const q = query(usersCol, where('email', '==', email));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      return snapshot.docs[0].data() as UserProfile;
    }
    return null;
  },

  async createUserProfile(profile: UserProfile) {
    await setDoc(doc(db, 'users', profile.uid), {
      ...profile,
      createdAt: profile.createdAt || serverTimestamp()
    });
    return profile;
  },

  async updateUserProfile(uid: string, profile: Partial<UserProfile>) {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, profile);
    const updatedDoc = await getDoc(docRef);
    return updatedDoc.data() as UserProfile;
  },

  async deleteUserProfile(uid: string) {
    await deleteDoc(doc(db, 'users', uid));
  },

  async getAllUserProfiles() {
    const usersCol = collection(db, 'users');
    const q = query(usersCol, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => doc.data() as UserProfile);
  }
};
