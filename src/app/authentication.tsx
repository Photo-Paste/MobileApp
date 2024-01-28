import { getAuth, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { app } from './firebase';

export async function logoutUser() {
  const firebaseAuth = getAuth(app);
  try {
    await signOut(firebaseAuth);
    console.log('User logged out successfully');
  } catch (error) {
    console.error('Logout Failed:', error);
  }
}

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  const firebaseAuth = getAuth(app);

  try {
    await signInWithPopup(firebaseAuth, provider);
  } catch (error) {
    console.error('Login Failed:', error);
  }
};  