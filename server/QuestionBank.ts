import { Question } from '../shared/types.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let allQuestions: Question[] = [];

export function loadQuestions(): void {
  const data = readFileSync(join(__dirname, 'questions', 'questions.json'), 'utf-8');
  allQuestions = JSON.parse(data);
}

export function getAllQuestions(): Question[] {
  return allQuestions;
}

export function getShuffledQuestions(): Question[] {
  const shuffled = [...allQuestions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
