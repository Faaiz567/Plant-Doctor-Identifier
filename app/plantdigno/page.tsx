'use client';
import React, { useState, useRef, useCallback } from 'react';
import Footer from '@/components/footer';
import Image from 'next/image';
import {
  Camera,
  Upload,
  Leaf,
  Loader2,
  XCircle,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

// Types for better type safety
type DiagnosisResult = {
  plantName: string;
  scientificName?: string;
  disease?: string;
  diseaseDescription?: string;
  description: string;
};

const PlantDiagnosis: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Image validation function
  const validateImage = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Please upload JPEG or PNG.');
      return false;
    }

    if (file.size > maxSize) {
      setError('Image is too large. Maximum file size is 5MB.');
      return false;
    }

    return true;
  };

  // Convert image to base64 for better compatibility
  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!validateImage(file)) return;

      try {
        const base64Image = await convertToBase64(file);
        setSelectedImage(base64Image);
        await analyzePlant(base64Image);
      } catch (error: unknown) {
        console.error('Image processing error:', error);
        setError('Failed to process image. Please try again.');
      }
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // Prefer back/rear camera on mobile devices
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (error: unknown) {
      console.error('Camera access error:', error);
      setError('Camera access denied. Please check permissions.');
    }
  };

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      setIsCameraActive(false);
    }
  }, []);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw the current video frame on the canvas
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to base64 image
      const imageDataUrl = canvas.toDataURL('image/jpeg');
      
      // Set the captured image
      setSelectedImage(imageDataUrl);
      
      // Stop the camera
      stopCamera();
      
      // Analyze the captured plant image
      analyzePlant(imageDataUrl);
    }
  };

  const analyzePlant = async (base64Image: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

      if (!apiKey) {
        throw new Error('API Key is missing. Check your .env.local file.');
      }
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: 'Carefully analyze this plant image. Provide a concise report including: 1) Plant Name, 2) Scientific Name, 3) Potential Diseases (if any), 4) Concise Disease Description, 5) Brief Plant Overview. Limit each section to 1-2 sentences.' },
                { inlineData: { 
                  mimeType: 'image/jpeg', 
                  data: base64Data 
                }}
              ]
            }]
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${errorText || 'Unknown error occurred'}`);
      }

      const data = await response.json();

      // Extract plant information from the response
      const plantInfo = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Advanced parsing of the response
      const parseResponse = (text: string) => {
        const result: DiagnosisResult = {
          plantName: 'Unknown Plant',
          description: text
        };

        // Extract plant name
        const nameMatch = text.match(/(?:Plant Name|Name):\s*(.+?)[\n.]/i);
        if (nameMatch) {
          result.plantName = nameMatch[1].trim();
        }

        // Extract scientific name
        const scientificNameMatch = text.match(/(?:Scientific Name|Latin Name):\s*(.+?)[\n.]/i);
        if (scientificNameMatch) {
          result.scientificName = scientificNameMatch[1].trim();
        }

        // Extract disease
        const diseaseMatch = text.match(/(?:Potential Diseases|Diseases?):\s*(.+?)[\n.]/i);
        if (diseaseMatch) {
          result.disease = diseaseMatch[1].trim();
        }

        // Extract disease description
        const diseaseDescriptionMatch = text.match(/(?:Disease Description|Detailed Disease Description):\s*(.+?)(?:\n|$)/i);
        if (diseaseDescriptionMatch) {
          result.diseaseDescription = diseaseDescriptionMatch[1].trim();
        }

        return result;
      };

      const diagnosis = parseResponse(plantInfo);
      setDiagnosis(diagnosis);

    } catch (error: unknown) {
      console.error('Diagnosis Error:', error);
      
      setError(
        error instanceof Error && error.message.includes('Failed to fetch')
          ? 'Network error. Check your internet connection.'
          : `Analysis failed: ${String(error)}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resetAnalysis = () => {
    setSelectedImage(null);
    setDiagnosis(null);
    setError(null);
  };

  return (
    <div>
    <div className="min-h-screen flex items-center justify-center p-4 animate-gradient bg-gradient-to-r from-blue-200 via-teal-200 to-blue-300 bg-[length:200%_200%]">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-center">
          <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-3">
            <Leaf className="w-10 h-10 text-white/90 animate-bounce" />
            Plant Doctor
          </h1>
          <p className="text-white/80 mt-2">Diagnose your plant&apos;s health instantly</p>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6" />
              <span>{error}</span>
            </div>
          )}

          {!selectedImage && !diagnosis && !isLoading && (
            <div className="space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/jpeg,image/png"
                onChange={handleFileUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-3 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
              >
                <Upload className="w-5 h-5" />
                Upload Image
              </button>

              <div className="flex items-center justify-center space-x-4">
                <div className="h-px bg-gray-300 flex-grow"></div>
                <span className="text-gray-500">or</span>
                <div className="h-px bg-gray-300 flex-grow"></div>
              </div>

              <button
                onClick={startCamera}
                className="w-full flex items-center justify-center gap-3 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
              >
                <Camera className="w-5 h-5" />
                Take Photo
              </button>
            </div>
          )}

          {isCameraActive && (
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg shadow-md"
              />
              <canvas 
                ref={canvasRef} 
                className="hidden" 
              />
              <button
                onClick={capturePhoto}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white shadow-lg p-3 rounded-full"
              >
                <Camera className="w-6 h-6 text-emerald-600" />
              </button>
            </div>
          )}

          {isLoading && (
            <div className="text-center py-8">
              <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mx-auto" />
              <p className="text-emerald-500 font-medium mt-2">Analyzing image...</p>
            </div>
          )}

          {selectedImage && !diagnosis && !isLoading && (
            <div className="relative">
              <Image
                src={selectedImage}
                alt="Uploaded Plant"
                width={400}
                height={400}
                className="w-full h-auto rounded-lg shadow-md"
              />
              <button
                onClick={resetAnalysis}
                className="absolute top-2 right-2 bg-white p-2 rounded-full shadow-md"
              >
                <XCircle className="w-6 h-6 text-red-500" />
              </button>
            </div>
          )}

          {diagnosis && (
            <div className="space-y-4">
              <div className="relative">
                <Image
                  src={selectedImage!}
                  alt="Diagnosed Plant"
                  width={400}
                  height={400}
                  className="w-full h-auto rounded-lg shadow-md"
                />
                <button
                  onClick={resetAnalysis}
                  className="absolute top-2 right-2 bg-white p-2 rounded-full shadow-md"
                >
                  <XCircle className="w-6 h-6 text-red-500" />
                </button>
              </div>

              <div className="p-4 bg-gray-100 rounded-lg shadow-md space-y-2">
                <table className="w-full border-collapse">
                  <tbody>
                    <tr className="border-b border-gray-200">
                      <td className="font-bold text-emerald-600 py-2 pr-4 w-1/3">
                        <CheckCircle2 className="inline-block w-5 h-5 mr-2" />
                        Plant Name
                      </td>
                      <td className="py-2">{diagnosis.plantName}</td>
                    </tr>

                    {diagnosis.scientificName && (
                      <tr className="border-b border-gray-200">
                        <td className="font-bold text-gray-600 py-2 pr-4 w-1/3">Scientific Name</td>
                        <td className="py-2">{diagnosis.scientificName}</td>
                      </tr>
                    )}

                    {diagnosis.disease && (
                      <tr className="border-b border-gray-200">
                        <td className="font-bold text-red-600 py-2 pr-4 w-1/3">Disease</td>
                        <td className="py-2">{diagnosis.disease}</td>
                      </tr>
                    )}

                    {diagnosis.diseaseDescription && (
                      <tr>
                        <td 
                          colSpan={2} 
                          className="pt-2 text-gray-600 whitespace-pre-wrap"
                        >
                          <strong className="block text-gray-700 mb-1">Disease Description:</strong>
                          {diagnosis.diseaseDescription}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {diagnosis.description && (
                  <div className="mt-4">
                    <p className="text-gray-600 whitespace-pre-wrap">{diagnosis.description}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    <Footer />
    </div>
  );
};

export default PlantDiagnosis;
