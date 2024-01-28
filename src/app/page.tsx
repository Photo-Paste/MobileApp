'use client'

import Image from 'next/image'
import { TokenResponse, googleLogout, useGoogleLogin } from '@react-oauth/google';
import React, { useState, useEffect , useRef, useCallback } from 'react';
import { app } from './firebase';
import { getAuth, GoogleAuthProvider, signInWithCredential, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, Firestore, getDocs, query } from 'firebase/firestore';
import { FcGoogle } from "react-icons/fc";
import ReactCrop, { PixelCrop, type Crop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'


const USER_INFO_URL = 'https://www.googleapis.com/oauth2/v1/userinfo?access_token=';;

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // State to hold the selected file
  const [ocrResult, setOcrResult] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const blobUrlRef = useRef("");
  const imgRef = useRef<HTMLImageElement>(null);
  const hiddenAnchorRef = useRef<HTMLAnchorElement>(null);



  const firebaseAuth = getAuth(app);

  const handleFileChange = (event: any) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);

      const fileUrl = URL.createObjectURL(event.target.files[0]);
      setImagePreviewUrl(fileUrl);
    }
  };


  async function processCroppedImage() {
    const image = imgRef.current;
    const previewCanvas = previewCanvasRef.current;
    if (!image || !previewCanvas || !completedCrop) {
      console.error("Crop canvas does not exist");
      return;
    }
  
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
  
    const offscreen = new OffscreenCanvas(
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
    );
    const ctx = offscreen.getContext("2d");
    if (!ctx) {
      console.error("No 2d context");
      return;
    }
  
    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      offscreen.width,
      offscreen.height,
    );
  
    const blob = await offscreen.convertToBlob({
      type: "image/jpeg",
    });
  
    const croppedFile = new File([blob], 'cropped-image.jpg', {
      type: 'image/jpeg',
    });
  
    sendFileToOcr(croppedFile);
  }
  

/// Function to handle OCR processing
const handleOcr = async () => {
  if (!selectedFile) return;

  if (completedCrop) {
    processCroppedImage();
  } else {
    sendFileToOcr(selectedFile); // This will send the original file
  }
};

const sendFileToOcr = async (file: any) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('apikey', 'K82946382288957'); // Replace with your actual OCR.space API key
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
  async function sendOcrResultToServer(ocrText: any, userEmail: any) {
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
          {imagePreviewUrl && (
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
            >
            <img
              src={imagePreviewUrl}
              ref={imgRef}
              alt="Preview"
              className="mt-2 w-32 h-32 object-cover" // Adjust the width and height as needed
              
            />
              <canvas ref={previewCanvasRef} style={{ display: 'none' }} />
          </ReactCrop>
        )}
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

