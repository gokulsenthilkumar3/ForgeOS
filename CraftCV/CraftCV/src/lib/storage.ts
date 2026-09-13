import { ResumeData, emptyResume } from '../types/resume';

const KEY = 'craftcv_data';

export function loadResume(): ResumeData {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : emptyResume;
  } catch {
    return emptyResume;
  }
}

export function saveResume(data: ResumeData): void {
  localStorage.setItem(KEY, JSON.stringify(data));
}
