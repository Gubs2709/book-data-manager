export interface Book {
  id: number;
  bookName: string;
  subject: string;
  publisher: string;
  price: number;
  discount: number;
  tax: number;
  finalPrice: number;
  pages?: number;
}

export type BookType = 'Textbook' | 'Notebook';

export interface FrequentBookData {
    id: string;
    userId: string;
    bookName: string;
    publisher: string;
    price: number;
    discount: number;
    tax: number;
    type: BookType;
    pages?: number;
}

export interface BookFilters {
    bookName: string;
    subject: string;
    publisher: string;
}

    