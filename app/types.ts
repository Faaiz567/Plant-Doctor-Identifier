// Import the existing types from '@google/generative-ai' to ensure you're not redeclaring them.
import '@google/generative-ai'; 

// Extend the existing GoogleGenerativeAI and GenerativeModel types if needed
declare global {
  // Extending GoogleGenerativeAI if you need to add custom methods
  interface GoogleGenerativeAI {
    customMethod(): void;  // Example method addition
  }

  // Extending GenerativeModel if you need to add custom properties or methods
  interface GenerativeModel {
    customProperty: string;  // Example property addition
  }
}

export interface PlantInfo {
  commonName: string;
  scientificName: string;
  family: string;
  nativeRegion: string;
  careRequirements: {
    light: string;
    water: string;
    soil: string;
  };
  interesting_facts: string[];
}