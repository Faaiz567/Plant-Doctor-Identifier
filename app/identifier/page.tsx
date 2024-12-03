'use client';
import { useState, ChangeEvent, useRef } from 'react';
import Image from 'next/image';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Camera, Upload } from 'lucide-react';

interface ImageState {
  file: File | null;
  preview: string | null;
}

interface PlantDetails {
  name: string;
  scientificName: string;
  description: string;
  details: {
    family: string;
    nativeRegion: string;
    growthHabit: string;
    flowerColor: string;
    leafType: string;
    soilType: string; // New detail
    waterNeeds: string; // New detail
    sunlightRequirements: string; // New detail
    temperatureTolerance: string; // New detail
    uses: string; // New detail
    toxicity: string; // New detail
  };
}

export default function Home() {
  const [imageState, setImageState] = useState<ImageState>({
    file: null,
    preview: null
  });
  const [result, setResult] = useState<PlantDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const extractJSONFromText = (text: string): string => {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}') + 1;
    if (start === -1 || end === 0) {
      throw new Error('No valid JSON found in response');
    }
    return text.slice(start, end);
  };

  const processImage = async (file: File) => {
    setImageState({
      file,
      preview: URL.createObjectURL(file)
    });
    setResult(null);
    setError(null);

    try {
      setLoading(true);

      const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || 'AIzaSyA6zgXRx4V7uKbYshqyu002XDyXn5VoMAg');
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const fileReader = new FileReader();
      fileReader.readAsDataURL(file);

      fileReader.onload = async () => {
        try {
          if (typeof fileReader.result !== 'string') {
            throw new Error('Failed to read image file');
          }

          const imageData = fileReader.result.split(',')[1];

          const response = await model.generateContent([
            "Analyze this plant image and provide ONLY a JSON response in exactly this format without any additional text or code blocks:\n" +
            "{\n" +
            '  "name": "Common Name",\n' +
            '  "scientificName": "Scientific Name",\n' +
            '  "description": "Brief description of the plant",\n' +
            '  "details": {\n' +
            '    "family": "Plant Family",\n' +
            '    "nativeRegion": "Native Region",\n' +
            '    "growthHabit": "Growth Habit",\n' +
            '    "flowerColor": "Flower Color",\n' +
            '    "leafType": "Leaf Type",\n' +
            '    "soilType": "Soil Type",\n' +
            '    "waterNeeds": "Water Needs",\n' +
            '    "sunlightRequirements": "Sunlight Requirements",\n' +
            '    "temperatureTolerance": "Temperature Tolerance",\n' +
            '    "uses": "Common Uses",\n' +
            '    "toxicity": "Toxicity Details"\n' +
            "  }\n" +
            "}",
            {
              inlineData: {
                data: imageData,
                mimeType: "image/jpeg"
              }
            }
          ]);

          const text = response.response.text();
          const jsonString = extractJSONFromText(text);
          const plantData: PlantDetails = JSON.parse(jsonString);
          setResult(plantData);
        } catch (err) {
          console.error('Error processing response:', err);
          setError(err instanceof Error ? err.message : 'An error occurred during plant identification');
        } finally {
          setLoading(false);
        }
      };
    } catch (err) {
      console.error('Error in main process:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setLoading(false);
    }
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-8 animate-gradient bg-gradient-to-r from-green-400 via-lime-400 to-blue-300 bg-[length:200%_200%]">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-green-800 text-center mb-8">
          Plant Identifier
        </h1>

        <div className="mb-6 text-center">
          <span className="inline-flex items-center px-4 py-2 rounded-full text-sm bg-green-100 text-green-800">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            Using Gemini 1.5 Flash AI Model
          </span>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
          {!imageState.preview ? (
            <div className="flex flex-col items-center gap-8">
              <div 
                onClick={() => cameraInputRef.current?.click()} 
                className="w-full max-w-sm p-6 border-2 border-dashed border-green-300 rounded-lg cursor-pointer hover:bg-green-50 transition-colors"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <Camera className="w-8 h-8 text-green-600" />
                  </div>
                  <span className="text-gray-600">Take a Photo</span>
                </div>
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()} 
                className="w-full max-w-sm p-6 border-2 border-dashed border-green-300 rounded-lg cursor-pointer hover:bg-green-50 transition-colors"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <Upload className="w-8 h-8 text-green-600" />
                  </div>
                  <span className="text-gray-600">Upload Photo</span>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center p-8">
                  <div className="w-16 h-16 relative">
                    <div className="absolute inset-0 border-4 border-green-200 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-green-600 rounded-full border-t-transparent animate-spin"></div>
                  </div>
                  <p className="mt-4 text-gray-600">Identifying your plant...</p>
                </div>
              ) : (
                <>
                  <div className="relative w-full h-64 md:h-96">
                    <Image
                      src={imageState.preview}
                      alt="Plant preview"
                      fill
                      className="object-contain rounded-lg"
                      priority
                    />
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                      {error}
                      <button 
                        onClick={() => setImageState({ file: null, preview: null })}
                        className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                      >
                        Try another image
                      </button>
                    </div>
                  )}

                  {result && (
                    <div className="bg-gray-50 rounded-lg p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-green-700">{result.name}</h2>
                        <button 
                          onClick={() => setImageState({ file: null, preview: null })}
                          className="text-sm text-green-600 hover:text-green-800 underline"
                        >
                          Identify another plant
                        </button>
                      </div>

                      <p className="text-gray-600 italic mb-4">{result.scientificName}</p>
                      <p className="text-gray-700 mb-6">{result.description}</p>

                      <h3 className="text-xl font-semibold text-green-600 mb-4">Plant Details</h3>
                      <div className="space-y-2">
                        {Object.entries(result.details).map(([key, value]) => (
                          <div key={key} className="grid grid-cols-2 gap-4 py-2 border-b border-gray-100">
                            <div className="text-gray-600 capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </div>
                            <div className="text-gray-800">
                              {value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}