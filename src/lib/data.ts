import type { Book } from './types';

export const TEXTBOOKS_MOCK: Book[] = [
  { id: 1, bookName: 'Physics Part 1', subject: 'Physics', price: 150, discount: 0, tax: 0, finalPrice: 150 },
  { id: 2, bookName: 'Chemistry Part 1', subject: 'Chemistry', price: 160, discount: 0, tax: 0, finalPrice: 160 },
  { id: 3, bookName: 'Mathematics', subject: 'Math', price: 180, discount: 0, tax: 0, finalPrice: 180 },
  { id: 4, bookName: 'English Reader', subject: 'English', price: 120, discount: 0, tax: 0, finalPrice: 120 },
  { id: 5, bookName: 'Computer Science', subject: 'Computers', price: 135, discount: 0, tax: 0, finalPrice: 135 },
];

export const NOTEBOOKS_MOCK: Book[] = [
  { id: 1, bookName: 'Single Line A4 Notebook', subject: 'General', price: 40, discount: 0, tax: 0, finalPrice: 40 },
  { id: 2, bookName: 'Graph Book', subject: 'Math', price: 35, discount: 0, tax: 0, finalPrice: 35 },
  { id: 3, bookName: 'Unruled A5 Sketchbook', subject: 'Drawing', price: 30, discount: 0, tax: 0, finalPrice: 30 },
  { id: 4, bookName: 'Practical Journal', subject: 'Science', price: 55, discount: 0, tax: 0, finalPrice: 55 },
];
