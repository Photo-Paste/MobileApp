let YOUR_API_KEY="AIzaSyAEDXTkQehTxGbqQ_JOip50sh_asrtFC_4";


export const performOCR = async (file: any, setOcrResult: (result: string) => void, sendOcrResultToServer: (detectedText: string, email: string) => void, email: string) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      if (typeof reader.result === 'string') {
        const base64data = reader.result.split(',')[1];
        const visionApiUrl = 'https://vision.googleapis.com/v1/images:annotate?key=' + YOUR_API_KEY; // Make sure YOUR_API_KEY is accessible here

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
          sendOcrResultToServer(detectedText, email);
        } catch (error) {
          console.error('OCR processing failed:', error);
          setOcrResult("OCR processing failed");
        }
      }
    };
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
          // Add any other headers like authentication tokens if needed
        },
        body: JSON.stringify(payload),
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      console.log('Success:', data);
      // Handle the response data as needed
    } catch (error) {
      console.error('Error:', error);
      // Handle or throw the error as needed
      throw error; // or handle it as per your application's error handling standards
    }
  }
