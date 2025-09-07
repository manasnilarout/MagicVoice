import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SessionConfig } from '../types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODEL = "gpt-4o-realtime-preview";

// Available languages
const AVAILABLE_LANGUAGES = ['hindi', 'kannada', 'telugu'] as const;
type AvailableLanguage = typeof AVAILABLE_LANGUAGES[number];

// Function to load prompt from file
function loadPrompt(language: string): string {
  const promptPath = path.join(__dirname, '..', 'prompts', `${language}.txt`);
  try {
    return fs.readFileSync(promptPath, 'utf-8');
  } catch (error) {
    console.error(`Error loading prompt for language: ${language}`, error);
    // Fallback to Hindi if file not found
    const fallbackPath = path.join(__dirname, '..', 'prompts', 'hindi.txt');
    return fs.readFileSync(fallbackPath, 'utf-8');
  }
}

const VOICE = "marin";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error("🔴 OpenAI API key not configured");
}

export function makeHeaders(contentType?: string): Record<string, string> {
  const obj: Record<string, string> = {
    Authorization: `Bearer ${OPENAI_API_KEY}`,
  };
  if (contentType) obj["Content-Type"] = contentType;
  return obj;
}

export function makeSession(language: string = 'hindi'): SessionConfig {
  // Validate language
  const selectedLanguage = AVAILABLE_LANGUAGES.includes(language as AvailableLanguage) ? language : 'hindi';
  const instructions = loadPrompt(selectedLanguage);
  
  return {
    type: "realtime",
    model: MODEL,
    instructions: instructions,
    audio: {
      input: { noise_reduction: { type: "near_field" } },
      output: { voice: VOICE },
    },
  };
}

export function getAvailableLanguages(): readonly string[] {
  return AVAILABLE_LANGUAGES;
}