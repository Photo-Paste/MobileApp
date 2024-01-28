// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAJ0HOAIEueds9-ZEbbRmaEigwhwBYu2aQ",
  authDomain: "photo-paste.firebaseapp.com",
  projectId: "photo-paste",
  storageBucket: "photo-paste.appspot.com",
  messagingSenderId: "465211077558",
  appId: "1:465211077558:web:a69754f913aa00cec90717",
  measurementId: "G-SBY4BD37TQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export { app };