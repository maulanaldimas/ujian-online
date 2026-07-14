import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyC5qrvWV_p22CbyfMyP2eZl805AlhsUds8",
  authDomain: "ujian-rekrutmen.firebaseapp.com",
  projectId: "ujian-rekrutmen",
  storageBucket: "ujian-rekrutmen.firebasestorage.app",
  messagingSenderId: "11143726119",
  appId: "1:11143726119:web:dfc01046eeb76c3a7e7a02"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);