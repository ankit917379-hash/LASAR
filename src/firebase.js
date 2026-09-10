
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDBvT-Bcbwno03WXYMNIYLhzPeJJBbntKw",
  authDomain: "lasar-86553.firebaseapp.com",
  projectId: "lasar-86553",
  storageBucket: "lasar-86553.firebasestorage.app",
  messagingSenderId: "963844224428",
  appId: "1:963844224428:web:fa56cd38f3ade5ce76b609",
  measurementId: "G-EZZZPJF4RN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);