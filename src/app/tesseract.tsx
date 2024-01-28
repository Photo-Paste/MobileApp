import React, { useState } from 'react';
import Tesseract from 'tesseract.js';

export default function OCRComponent() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [ocrText, setOcrText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (event: any) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleOCR = () => {
    if (selectedFile) {
      setIsProcessing(true);
      Tesseract.recognize(
        selectedFile,
        'eng', // You can change the language code
        {
          logger: (m: any) => console.log(m), // Logs progress (optional)
        }
      ).then(({ data: { text } }) => {
        setOcrText(text);
        setIsProcessing(false);
      });
    }
  };

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleFileChange} />
      <button onClick={handleOCR} disabled={isProcessing}>
        {isProcessing ? 'Processing...' : 'Process Image'}
      </button>
      {ocrText && (
        <div>
          <p>Recognized Text:</p>
          <textarea value={ocrText} readOnly />
        </div>
      )}
    </div>
  );
}
