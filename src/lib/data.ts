import type { Book } from './types';

export const TEXTBOOKS_MOCK: Book[] = [
  { id: 1, bookName: 'Physics Part 1', subject: 'Physics', publisher: 'NCERT', price: 150, discount: 0, tax: 0, finalPrice: 150 },
  { id: 2, bookName: 'Chemistry Part 1', subject: 'Chemistry', publisher: 'NCERT', price: 160, discount: 0, tax: 0, finalPrice: 160 },
  { id: 3, bookName: 'Mathematics', subject: 'Math', publisher: 'RD Sharma', price: 180, discount: 0, tax: 0, finalPrice: 180 },
  { id: 4, bookName: 'English Reader', subject: 'English', publisher: 'Oxford', price: 120, discount: 0, tax: 0, finalPrice: 120 },
  { id: 5, bookName: 'Computer Science', subject: 'Computers', publisher: 'Sumita Arora', price: 135, discount: 0, tax: 0, finalPrice: 135 },
];

export const NOTEBOOKS_MOCK: Book[] = [
  { id: 1, bookName: 'Single Line A4 Notebook', subject: 'General', publisher: 'Classmate', pages: 180, price: 40, discount: 0, tax: 0, finalPrice: 40 },
  { id: 2, bookName: 'Graph Book', subject: 'Math', publisher: 'Classmate', pages: 60, price: 35, discount: 0, tax: 0, finalPrice: 35 },
  { id: 3, bookName: 'Unruled A5 Sketchbook', subject: 'Drawing', publisher: 'Navneet', pages: 100, price: 30, discount: 0, tax: 0, finalPrice: 30 },
  { id: 4, bookName: 'Practical Journal', subject: 'Science', publisher: 'Navneet', pages: 120, price: 55, discount: 0, tax: 0, finalPrice: 55 },
];
