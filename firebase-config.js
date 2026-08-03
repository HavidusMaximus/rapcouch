// Import the functions you need from the SDKs you need

import { initializeApp } from "firebase/app";

import { getAnalytics } from "firebase/analytics";

// TODO: Add SDKs for Firebase products that you want to use

// https://firebase.google.com/docs/web/setup#available-libraries


// Your web app's Firebase configuration

// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseConfig = {

  apiKey: "AIzaSyCZGmC2b5I2etXGx08n_trr3od5FDHUxFE",

  authDomain: "rapcouch-7d8f1.firebaseapp.com",

  databaseURL: "https://rapcouch-7d8f1-default-rtdb.europe-west1.firebasedatabase.app",

  projectId: "rapcouch-7d8f1",

  storageBucket: "rapcouch-7d8f1.firebasestorage.app",

  messagingSenderId: "335634630735",

  appId: "1:335634630735:web:b1fdd78e1391783ac9c23a",

  measurementId: "G-2HR91BNVJ1"

};


// Initialize Firebase

const app = initializeApp(firebaseConfig);

const analytics = getAnalytics(app);