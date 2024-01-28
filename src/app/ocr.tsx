import { useState } from "react";

let YOUR_API_KEY="AIzaSyAEDXTkQehTxGbqQ_JOip50sh_asrtFC_4";

interface OCRResult {
  text: string;
  vertices: { x: number; y: number }[];
}

type Detection = {
  description: string;
  boundingPoly: {
    vertices: Array<{ x: number; y: number }>;
  };
};

export const useOCR = () => {
  const [ocrResult, setOcrResult] = useState('');
  const [ocrData, setOcrData] = useState<OCRResult[]>([]);


  const performOCR = async (file, email, sendOcrResultToServer) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      if (typeof reader.result === 'string') {
        const base64data = reader.result.split(',')[1];
        const visionApiUrl = 'https://vision.googleapis.com/v1/images:annotate?key=' + YOUR_API_KEY;
  
        const requestPayload = {
          requests: [
            {
              image: { content: base64data },
              features: [{ type: "TEXT_DETECTION" }]
            }
          ]
        };
  
        try {
          const response = await fetch(visionApiUrl, {
            method: 'POST',
            body: JSON.stringify(requestPayload),
            headers: { 'Content-Type': 'application/json' }
          });
  
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
  
          const data = await response.json();
  
          if (data.responses && data.responses[0] && data.responses[0].textAnnotations) {
            const detections = data.responses[0].textAnnotations;
            const detectedText = detections[0]?.description;
            setOcrResult(detectedText);
      
            const ocrResultsWithBoxes = detections.slice(1).map(detection => ({
              text: detection.description,
              vertices: detection.boundingPoly?.vertices
            }));
            setOcrData(ocrResultsWithBoxes);
  
            // Call sendOcrResultToServer at the end with the detected text
            sendOcrResultToServer(detectedText, email);
          } else {
            console.error('No text annotations found in the response');
            setOcrResult('No text detected');
          }
        } catch (error) {
          console.error('OCR processing failed:', error);
          setOcrResult("OCR processing failed");
        }
      }
    };
  };
  return { ocrResult, ocrData, performOCR };
};

export async function sendOcrResultToServer(ocrText: string, userEmail: string) {
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
      throw error;
    }
  }
