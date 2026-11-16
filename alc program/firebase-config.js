// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBqJStzOrOowKsQ8K2_B3W0YeIZkLsPEe8",
  authDomain: "agapeschoolprogram.firebaseapp.com",
  projectId: "agapeschoolprogram",
  storageBucket: "agapeschoolprogram.appspot.com",
  messagingSenderId: "329535212806",
  appId: "1:329535212806:web:1bb996ff776d4851ee6287",
  measurementId: "G-1XHHQ45XGJ"
};

// Singleton pattern for Firebase services
let app;
let db;
let auth;
let isInitialized = false;
let initializationPromise = null;

// Initialize Firebase services
const initializeFirebase = () => {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      // Initialize Firebase if not already initialized
      if (!firebase.apps.length) {
        app = firebase.initializeApp(firebaseConfig);
        console.log('Firebase initialized successfully');
      } else {
        app = firebase.app();
        console.log('Using existing Firebase app');
      }
      
      // Initialize Firestore
      db = firebase.firestore();
      auth = firebase.auth();
      
      // Enable offline persistence
      try {
        await db.enablePersistence({
          synchronizeTabs: true
        });
        console.log('Offline persistence enabled');
      } catch (error) {
        if (error.code === 'failed-precondition') {
          console.warn('Offline persistence can only be enabled in one tab at a time.');
        } else if (error.code === 'unimplemented') {
          console.warn('The current browser doesn\'t support offline persistence.');
        } else {
          console.warn('Offline persistence error:', error.code, error.message);
        }
      }
      
      // Make Firebase available globally for debugging
      window.firebase = firebase;
      
      isInitialized = true;
      console.log('Firebase services initialized');
      return { app, db, auth };
    } catch (error) {
      console.error('Firebase initialization failed:', error);
      isInitialized = false;
      throw error;
    }
  })();

  return initializationPromise;
};

// Database service for Firestore operations
const database = {
  // Get student by admission number
  async getStudentByAdmissionNumber(admissionNumber) {
    try {
      const snapshot = await db.collection('students')
        .where('admissionNumber', '==', admissionNumber)
        .limit(1)
        .get();
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting student by admission number:', error);
      throw error;
    }
  },
  
  // Update student record
  async updateStudent(id, data) {
    try {
      await db.collection('students').doc(id).update({
        ...data,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating student:', error);
      throw error;
    }
  },
  
  // Get fee balance for a student
  async getStudentFeeBalance(admissionNumber, term) {
    try {
      const student = await this.getStudentByAdmissionNumber(admissionNumber);
      if (!student) return null;
      
      // Calculate total fee and paid amount
      const totalFee = calculateTotalFee(student, term);
      const totalPaid = student.payments 
        ? student.payments
            .filter(p => p.term === term && !p.isCarryForward)
            .reduce((sum, p) => sum + (parseFloat(p.amountPaid) || 0), 0)
        : 0;
      
      // Get carry forward from previous term if applicable
      const carryForward = student.payments
        ? student.payments
            .find(p => p.term === term && p.isCarryForward)
        : null;
      
      return {
        totalFee,
        totalPaid,
        balance: totalFee - totalPaid,
        carryForward: carryForward ? carryForward.amountPaid : 0
      };
    } catch (error) {
      console.error('Error getting fee balance:', error);
      throw error;
    }
  },
  // Listen for real-time updates
  onStudentsUpdate(callback) {
    return db.collection('students')
      .orderBy('fullName')
      .onSnapshot(
        (snapshot) => {
          const students = [];
          snapshot.forEach((doc) => {
            students.push({ id: doc.id, ...doc.data() });
          });
          callback(students);
        },
        (error) => {
          console.error('Error getting students:', error);
          showNotification('Error loading students. Please try again.', 'error');
        }
      );
  },

  // Get all students
  async getStudents() {
    try {
      const snapshot = await db.collection('students').orderBy('fullName').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting students:', error);
      showNotification('Error loading students. Please try again.', 'error');
      return [];
    }
  },

  // Get a single student by ID
  async getStudent(id) {
    try {
      const doc = await db.collection('students').doc(id).get();
      if (doc.exists) {
        return { id: doc.id, ...doc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting student:', error);
      throw error;
    }
  },

  // Add or update a student
  async saveStudent(studentData) {
    const { id, ...data } = studentData;
    
    try {
      if (id) {
        await db.collection('students').doc(id).update({
          ...data,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return id;
      } else {
        const docRef = await db.collection('students').add({
          ...data,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return docRef.id;
      }
    } catch (error) {
      console.error('Error saving student:', error);
      throw error;
    }
  },

  // Delete a student
  async deleteStudent(id) {
    try {
      // First delete all payments for this student
      const payments = await db.collection('students').doc(id).collection('payments').get();
      const batch = db.batch();
      
      payments.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Then delete the student
      batch.delete(db.collection('students').doc(id));
      
      await batch.commit();
    } catch (error) {
      console.error('Error deleting student:', error);
      throw error;
    }
  },

  // Record a payment
  async recordPayment(paymentData) {
    const { studentId, ...payment } = paymentData;
    
    try {
      const docRef = await db.collection('students')
        .doc(studentId)
        .collection('payments')
        .add({
          ...payment,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      
      return docRef.id;
    } catch (error) {
      console.error('Error recording payment:', error);
      throw error;
    }
  },

  // Get payment history for a student
  async getPaymentHistory(studentId) {
    try {
      const snapshot = await db.collection('students')
        .doc(studentId)
        .collection('payments')
        .orderBy('createdAt', 'desc')
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore timestamp to Date object
        date: doc.data().date?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      }));
    } catch (error) {
      console.error('Error getting payment history:', error);
      throw error;
    }
  },

  // Get fee structure
  async getFeeStructure() {
    try {
      const doc = await db.collection('settings').doc('feeStructure').get();
      if (doc.exists) {
        return doc.data();
      }
      return null;
    } catch (error) {
      console.error('Error getting fee structure:', error);
      throw error;
    }
  },

  // Save fee structure
  async saveFeeStructure(feeStructure) {
    try {
      await db.collection('settings').doc('feeStructure').set(feeStructure, { merge: true });
    } catch (error) {
      console.error('Error saving fee structure:', error);
      throw error;
    }
  }
};

// Initialize Firebase with proper error handling
async function initFirebase() {
    try {
        if (isInitialized) {
            console.log('Firebase already initialized');
            return { db, auth };
        }
        
        console.log('Initializing Firebase...');
        const services = await initializeFirebase();
        console.log('Firebase initialized successfully');
        return services;
    } catch (error) {
        const errorMsg = `Firebase initialization failed: ${error.message}`;
        console.error(errorMsg, error);
        throw new Error(errorMsg);
    }
}

// Make initFirebase available globally for non-module scripts
if (typeof window !== 'undefined') {
    window.initFirebase = initFirebase;
    console.log('initFirebase registered on window object');
}

// Show notification to user
function showNotification(message, type = 'info') {
    // Check if Toastify is available
    if (typeof Toastify === 'function') {
        Toastify({
            text: message,
            duration: 5000,
            gravity: 'top',
            position: 'right',
            backgroundColor: type === 'error' ? '#dc3545' : '#28a745',
            stopOnFocus: true
        }).showToast();
    } else {
        // Fallback to alert if Toastify is not available
        alert(`${type.toUpperCase()}: ${message}`);
    }
}

// Self-executing async function to initialize Firebase when the script loads
(async function initializeApp() {
  try {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      await new Promise(resolve => {
        document.addEventListener('DOMContentLoaded', resolve);
      });
    }
    
    console.log('Starting Firebase initialization...');
    await initFirebase();
    console.log('Firebase initialization completed successfully');
    
    // Dispatch a custom event when Firebase is ready
    const event = new Event('firebase:initialized');
    document.dispatchEvent(event);
    
  } catch (error) {
    console.error('Fatal error during initialization:', error);
    
    // Show error in the UI if possible
    const errorContainer = document.createElement('div');
    errorContainer.className = 'fixed top-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50';
    errorContainer.innerHTML = `
      <div class="flex items-center">
        <i class="fas fa-exclamation-circle mr-2"></i>
        <span>Failed to initialize the application. Please refresh the page.</span>
      </div>
      <button onclick="this.parentElement.remove()" class="absolute top-1 right-2 text-white">
        <i class="fas fa-times"></i>
      </button>
    `;
    document.body.appendChild(errorContainer);
  }
})();