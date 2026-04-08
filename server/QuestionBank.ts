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

function shuffle(arr: Question[]): Question[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function getShuffledQuestions(difficultyScaling = true): Question[] {
  if (difficultyScaling) {
    // Sort by difficulty: easy first, then medium, then hard
    const easy = allQuestions.filter(q => q.difficulty === 1);
    const medium = allQuestions.filter(q => q.difficulty === 2);
    const hard = allQuestions.filter(q => q.difficulty === 3);
    return [...shuffle(easy), ...shuffle(medium), ...shuffle(hard)];
  } else {
    // Fully random
    return shuffle(allQuestions);
  }
}
