'use client'

import Image from 'next/image'
import { TokenResponse, googleLogout, useGoogleLogin } from '@react-oauth/google';
import React, { useState, useEffect , useRef } from 'react';
import { app } from './firebase';
import { getAuth, GoogleAuthProvider, signInWithCredential, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, Firestore, getDocs, query } from 'firebase/firestore';
import { FcGoogle } from "react-icons/fc";

const USER_INFO_URL = 'https://www.googleapis.com/oauth2/v1/userinfo?access_token=';;

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // State to hold the selected file
  const [ocrResult, setOcrResult] = useState('');
  const [userEmail, setUserEmail] = useState('');

  const firebaseAuth = getAuth(app);

  const handleSubmit = () => {
    sendOcrResultToServer(ocrResult, userEmail);
  };

  // Function to handle file selection
  const handleFileChange = (event) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleOcr = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('apikey', 'K82946382288957'); // Replace with your OCR.space API key
    formData.append('language', 'eng'); // You can change this according to your requirements

    try {
        const response = await fetch('https://api.ocr.space/parse/image', {
            method: 'POST',
            body: formData,
        });
        const data = await response.json();

        if (data.ParsedResults && data.ParsedResults.length > 0) {
            const parsedText = data.ParsedResults[0].ParsedText;
            setOcrResult(parsedText);

            await sendOcrResultToServer(parsedText, profile.email);
        } else {
            setOcrResult("No text recognized");
        }
    } catch (error) {
        console.error('OCR processing failed:', error);
        setOcrResult("OCR processing failed");
    }
    };

  // Function to send the OCR result to the server
  async function sendOcrResultToServer(ocrText, userEmail) {
    const url = `http://68.183.156.19/records/${userEmail}`; // Replace with your actual API endpoint
    const payload = {
      text: ocrText,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add any other headers like authentication tokens if needed
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Success:', data);
      // Handle the response data
    } catch (error) {
      console.error('Error:', error);
      // Handle errors
    }
  }


  
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(firebaseAuth, provider);
        // Handle the result

        // The user is now authenticated with Firebase, let's create a Firestore document
        const userDocRef = doc(getFirestore(), 'users', result.user.uid);
        const userDoc = await getDoc(userDocRef);
    
        // Check if the user document exists
        if (!userDoc.exists()) {
            await setDoc(userDocRef, {
                uid: result.user.uid,
                email: result.user.email,
                name: result.user.displayName,
            });
            console.log('Firestore user document created!');
        }
        
        // Update the user state with the Firebase user information
        const firebaseUser = result.user;
        setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL, // Profile picture URL
        });

        // Set profile directly from Firebase user
        setProfile({
            name: firebaseUser.displayName,
            email: firebaseUser.email,
            picture: firebaseUser.photoURL,
        });

    } catch (error) {
        console.error('Login Failed:', error);
    }
  };
  
// Firebase Logout
const logoutUser = () => {
    signOut(firebaseAuth).then(() => {
        // Sign-out successful.
        setProfile(null);
    }).catch((error) => {
        console.error('Logout Failed:', error);
    });
};

//useEffect to handle if user is already logged in
useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
    }

}, []);


return (
  <div>
      <div className="relative">
          {profile ? (
              <div>
                  <img src={profile.picture} alt="user image" className="absolute top-0 right-0 rounded-full h-12 mt-5 mr-5" />
              </div>
          ) : (
              <div className='absolute top-0 right-0 mt-10 mr-10' onClick={loginWithGoogle}>
                  <button>
                      <FcGoogle className="mr-3 w-6 h-6" />
                      Sign in with Google
                  </button>
              </div>
          )}
          <hr className="border-t border-gray-300" />
      </div>
      {profile ? (
        <div className="flex flex-col items-center mt-5">
          <span>Upload Image</span>
          <input type="file" accept="image/*" onChange={handleFileChange} />
          {selectedFile && <div>Selected file: {selectedFile.name}</div>}
          {selectedFile && (
            <button className="mt-2" onClick={handleOcr}>
              Process OCR
            </button>
          )}
          {ocrResult && <div className="mt-3">{ocrResult}</div>}
        </div>
      ) : (
        <div className="flex justify-center mt-5">
          {/* Additional UI when the user is not logged in */}
        </div>
      )}
  </div>

  
);
}

