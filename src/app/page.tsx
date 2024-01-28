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
import firebase from 'firebase/compat/app';


const USER_INFO_URL = 'https://www.googleapis.com/oauth2/v1/userinfo?access_token=';
let YOUR_API_KEY="AIzaSyAEDXTkQehTxGbqQ_JOip50sh_asrtFC_4";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
  
    performOCR(croppedFile);
  }
  
  const handleOcr = async () => {
    if (!selectedFile) return;
  
    if (completedCrop) {
      processCroppedImage();
    } else {
      performOCR(selectedFile);
    }
  };
  
  const performOCR = async (file: any) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      if (typeof reader.result === 'string') {
        const base64data = reader.result.split(',')[1];
  
      const visionApiUrl = 'https://vision.googleapis.com/v1/images:annotate?key=' + YOUR_API_KEY;
  
      const requestPayload = {
        requests: [
          {
            image: {
              content: base64data
            },
            features: [
              {
                type: "TEXT_DETECTION"
              }
            ]
          }
        ]
      };
  
      try {
        const response = await fetch(visionApiUrl, {
          method: 'POST',
          body: JSON.stringify(requestPayload),
          headers: {
            'Content-Type': 'application/json'
          }
        });
  
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
  
        const data = await response.json();
        const detectedText = data.responses[0].fullTextAnnotation.text;
        setOcrResult(detectedText);
        sendOcrResultToServer(detectedText, profile.email);
      } catch (error) {
        console.error('OCR processing failed:', error);
        setOcrResult("OCR processing failed");
      }
    };
  };
  };

  async function sendOcrResultToServer(ocrText: any, userEmail: any) {
    const url = `http://68.183.156.19/records/${userEmail}`;
    const payload = {
      text: ocrText,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Success:', data);
    } catch (error) {
      console.error('Error:', error);
    }
  }


  
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(firebaseAuth, provider);
    } catch (error) {
      console.error('Login Failed:', error);
    }
  };

  const logoutUser = async () => {
    try {
      await signOut(firebaseAuth);
    } catch (error) {
      console.error('Logout Failed:', error);
    }
  };
  


useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
    }

}, []);

useEffect(() => {
  const unsubscribe = getAuth(app).onAuthStateChanged((user) => {
    if (user) {
      setUser({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      });
      setProfile({
        name: user.displayName,
        email: user.email,
        picture: user.photoURL,
      });
    } else {
      setUser(null);
      setProfile(null);
    }
  });

  return () => unsubscribe();
}, []);


return (
<div className="container mx-auto p-4">
  <div className="relative">
    {profile ? (
      <div className="fixed top-0 left-0 mt-5 ml-5 z-10">
        <button onClick={logoutUser} className="bg-red-500 text-white px-4 py-2 rounded shadow hover:bg-red-600 transition duration-150 ease-in-out">
          Logout
        </button>
      </div>
    ) : (
      <div className='absolute top-0 right-0 mt-10 mr-10'>
        <button
          onClick={loginWithGoogle}
          className="flex items-center bg-blue-500 text-white px-4 py-2 rounded shadow hover:bg-blue-600 transition duration-150 ease-in-out"
        >
          <FcGoogle className="mr-2" />
          Sign in with Google
        </button>
      </div>
    )}
    <hr className="border-t border-gray-300 my-4" />
  </div>
  {profile && (
    <div className="flex flex-col items-center mt-5">
      <span className="text-lg font-medium mb-4">Upload Image</span>
      <input type="file" accept="image/*" onChange={handleFileChange} className="mb-4" />
      {selectedFile && <div>Selected file: {selectedFile.name}</div>}
      {imagePreviewUrl && (
        <div className="relative mt-2 w-full flex justify-center">
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
          >
            <img
              src={imagePreviewUrl}
              ref={imgRef}
              alt="Preview"
              className="max-w-full h-auto object-cover" // Adjust for responsive max-width and auto height
            />
          </ReactCrop>
          <canvas ref={previewCanvasRef} style={{ display: 'none' }} />
          {ocrResult && (
            <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center bg-black bg-opacity-50 p-4 text-white">
              {ocrResult}
            </div>
          )}
        </div>
      )}
      {selectedFile && (
        <button className="mt-4 bg-green-500 text-white px-4 py-2 rounded shadow hover:bg-green-600 transition duration-150 ease-in-out" onClick={handleOcr}>
          Process OCR
        </button>
      )}
      {ocrResult && <div className="mt-3 p-4 bg-gray-100 rounded">{ocrResult}</div>}
    </div>
  )}
</div>
);
};