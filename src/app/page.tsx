'use client'

import Image from 'next/image'
import { TokenResponse, googleLogout, useGoogleLogin } from '@react-oauth/google';
import React, { useState, useEffect , useRef, useCallback, use } from 'react';
import { app } from './firebase';
import { getAuth, GoogleAuthProvider, signInWithCredential, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, Firestore, getDocs, query } from 'firebase/firestore';
import { FcGoogle } from "react-icons/fc";
import ReactCrop, { PixelCrop, type Crop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import firebase from 'firebase/compat/app';
import { logoutUser, loginWithGoogle } from './authentication'; 
import { sendOcrResultToServer } from './ocr';
import { useOCR} from './ocr';

const USER_INFO_URL = 'https://www.googleapis.com/oauth2/v1/userinfo?access_token=';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const blobUrlRef = useRef("");
  const imgRef = useRef<HTMLImageElement>(null);
  const hiddenAnchorRef = useRef<HTMLAnchorElement>(null);
  const { ocrResult, ocrData, performOCR, setOcrData } = useOCR();
  const [ocrMode, setOcrMode] = useState('TEXT_DOCUMENT');
  const [overlayKey, setOverlayKey] = useState(0);

  const handleFileChange = (event: any) => {
    if (event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setImagePreviewUrl(URL.createObjectURL(event.target.files[0]));
      performOCR(event.target.files[0], 'TEXT_DOCUMENT', profile?.email);
    }
  };


  async function processCroppedImage() {
    try {
      const image = imgRef.current;
      const previewCanvas = previewCanvasRef.current;
  
      if (!image || !previewCanvas || !completedCrop) {
        return;
      }
  
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
  
      const offscreen = new OffscreenCanvas(
        completedCrop.width * scaleX,
        completedCrop.height * scaleY
      );
      const ctx = offscreen.getContext("2d");
      if (!ctx) {
        console.log("Unable to obtain 2D context from OffscreenCanvas.");
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
        offscreen.height
      );
  
      const blob = await offscreen.convertToBlob({
        type: "image/jpeg",
      });
  
      const croppedFile = new File([blob], 'cropped-image.jpg', {
        type: 'image/jpeg',
      });
  
      performOCR(croppedFile, ocrMode, profile.email);
    } catch (error) {
      console.log("An error occurred while processing the cropped image:", error);
      // Optionally, handle the error by showing a user-friendly message or taking other actions
    }
  }
  
  const handleOcr = () => {
    if (completedCrop) {
      processCroppedImage();
      sendOcrResultToServer(ocrResult, profile.email);
    }
    else if (selectedFile && profile) {
      sendOcrResultToServer(ocrResult, profile.email);
    }
  };

  const toggleOcrMode = () => {
    setOcrMode(ocrMode === 'TEXT_DOCUMENT' ? 'HANDWRITTEN' : 'TEXT_DOCUMENT');
  };

  useEffect(() => {
    if (completedCrop && completedCrop.width > 0 && completedCrop.height > 0) {
      processCroppedImage();
    }
  }, [completedCrop]);
  
const handleCompleteCrop = (c: any) => {
  setCompletedCrop(c);  
  processCroppedImage();
}




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

const renderTextOverlays = () => {
  if (!imgRef.current || !ocrData || ocrData.length === 0) return null;

  const imgElement = imgRef.current;
  const scaleX = imgElement.clientWidth / imgElement.naturalWidth;
  const scaleY = imgElement.clientHeight / imgElement.naturalHeight;

  return ocrData.map((data, index) => {
    const style: React.CSSProperties = {
      position: 'absolute',
      left: `${data.vertices[0].x * scaleX}px`,
      top: `${data.vertices[0].y * scaleY}px`,
      color: 'red',
      fontSize: '15px',
      textShadow: '1px 1px 0 black, -1px -1px 0 black, 1px -1px 0 black, -1px 1px 0 black',
    };

    return <div key={index} style={style}>{data.text}</div>;
  });
};


return (
    <div>
      {profile ? (
        <>
  <div className="flex justify-between items-start p-4">
    <div className="z-10">
      <button onClick={logoutUser} className="bg-red-500 text-white px-4 py-2 rounded shadow hover:bg-red-600 transition duration-150 ease-in-out">
        Logout
      </button>
    </div>
    <div className="z-10">
      <img src={profile.picture} alt="user image" className="rounded-full h-12 w-12" />
    </div>
  </div>

  <div className="container mx-auto px-4">
    <div className="flex flex-col items-center mt-5">
      <span className="text-lg font-medium mb-4">Upload Image</span>
      <button
            onClick={toggleOcrMode}
            className="mb-4 bg-purple-500 text-white px-4 py-2 rounded shadow hover:bg-purple-600 transition duration-150 ease-in-out"
          >
            {ocrMode === 'TEXT_DOCUMENT' ? 'Switch to Handwritten Mode' : 'Switch to Text Document Mode'}
          </button>
      
      <label htmlFor="file-upload" className="cursor-pointer bg-blue-500 text-white px-4 py-2 rounded shadow hover:bg-blue-600 transition duration-150 ease-in-out mb-4">
        <span>Select File</span>
        <input id="file-upload" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      </label>

      {selectedFile && (
        <div className="bg-gray-100 rounded p-2 text-sm text-gray-700">
          Selected file: <span className="font-semibold">{selectedFile.name}</span>
        </div>
      )}

      {imagePreviewUrl && (
        <div className="relative mt-2 w-full flex justify-center">
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={handleCompleteCrop}
          >
            <img
              src={imagePreviewUrl}
              ref={imgRef}
              alt="Preview"
              className="max-w-full h-auto object-cover"
            />
          </ReactCrop>
          <canvas ref={previewCanvasRef} style={{ display: 'none' }} />
          {renderTextOverlays()}
        </div>
      )}
      {ocrResult && (
        <div className= "m-4 max-w-l">{ocrResult} </div>
      )} 
      {selectedFile && (
        <button className="mt-4 bg-green-500 text-white px-4 py-2 rounded shadow hover:bg-green-600 transition duration-150 ease-in-out" onClick={handleOcr}>
          Process Image
        </button>
      )}

    </div>
  </div>
</>
      ) : (
        <div className="text-center mt-10">
          <h1 className="text-4xl font-bold mb-5">PhotoPaste</h1>
          <img src="/photo-paste-logo.png" alt="PhotoPaste Logo" className="mx-auto mb-5" style={{ maxWidth: '200px' }} />
          <button
            onClick={loginWithGoogle}
            className="flex items-center bg-blue-500 text-white px-4 py-2 rounded shadow hover:bg-blue-600 transition duration-150 ease-in-out justify-center mx-auto"
          >
            <FcGoogle className="mr-2" />
            Sign in with Google
          </button>
        </div>
      )}
    </div>
  );
      };