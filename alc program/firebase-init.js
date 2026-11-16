// Import the functions you need from the SDKs you need
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { 
    getFirestore, 
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
    serverTimestamp,
    enableIndexedDbPersistence,
    runTransaction
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-analytics.js';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBqJStzOrOowKsQ8K2_B3W0YeIZkLsPEe8",
    authDomain: "agapeschoolprogram.firebaseapp.com",
    projectId: "agapeschoolprogram",
    storageBucket: "agapeschoolprogram.appspot.com",
    messagingSenderId: "329535212806",
    appId: "1:329535212806:web:1bb996ff776d4851ee6287",
    measurementId: "G-1XHHQ45XGJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// Enable offline persistence
enableIndexedDbPersistence(db)
    .catch((err) => {
        console.error("Error enabling offline persistence:", err);
    });

// Database functions
const database = {
    // Students collection
    students: collection(db, 'students'),
    
    // Payments collection
    payments: collection(db, 'payments'),
    
    // Listen for real-time updates
    onStudentsUpdate: (callback) => {
        return onSnapshot(collection(db, 'students'), callback);
    },
    
    // Get all students
    getStudents: async () => {
        const querySnapshot = await getDocs(collection(db, 'students'));
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    },
    
    // Add or update student
    saveStudent: async (studentData) => {
        if (studentData.id) {
            // Update existing student
            const { id, ...data } = studentData;
            const studentRef = doc(db, 'students', id);
            await updateDoc(studentRef, data);
            return id;
        } else {
            // Add new student
            const docRef = doc(collection(db, 'students'));
            await setDoc(docRef, studentData);
            return docRef.id;
        }
    },
    
    // Delete student
    deleteStudent: async (studentId) => {
        await deleteDoc(doc(db, 'students', studentId));
    },
    
    // Record payment
    recordPayment: async (paymentData) => {
        const paymentRef = doc(collection(db, 'payments'));
        const paymentWithTimestamp = {
            ...paymentData,
            timestamp: serverTimestamp()
        };
        
        await setDoc(paymentRef, paymentWithTimestamp);
        
        // Update student's balance
        const studentRef = doc(db, 'students', paymentData.studentId);
        await runTransaction(db, async (transaction) => {
            const studentDoc = await transaction.get(studentRef);
            if (!studentDoc.exists()) {
                throw new Error("Student not found");
            }
            
            const currentBalance = studentDoc.data().feeBalance || 0;
            const newBalance = currentBalance - paymentData.amount;
            transaction.update(studentRef, { feeBalance: newBalance });
        });
        
        return paymentRef.id;
    },
    
    // Get student's payment history
    getPaymentHistory: async (studentId) => {
        const q = query(
            collection(db, 'payments'),
            where('studentId', '==', studentId),
            orderBy('timestamp', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }
};

// Make database available globally
window.database = database;

export { db, database };
