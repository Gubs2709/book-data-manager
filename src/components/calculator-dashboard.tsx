"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import type { Book, FrequentBookData, BookType, BookFilters, Upload, DenormalizedBook } from "@/lib/types";
import { TEXTBOOKS_MOCK, NOTEBOOKS_MOCK } from "@/lib/data";
import { BookTable } from "./book-table";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Calculator, Download, FileUp, Undo2, BookOpen, GraduationCap, Save, Tags, Edit, X, Check, ChevronsUpDown } from "lucide-react";
import { Separator } from "./ui/separator";
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";
import { useFirebase, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { addDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Badge } from "./ui/badge";

// ✅ Utility: Remove undefined fields before saving to Firestore
function cleanFirestoreData<T extends Record<string, any>>(data: T): T {
  return Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined)) as T;
}

const createBookId = (book: Partial<Book>, type: BookType): string => {
  let id = `${book.bookName}-${book.publisher}-${type}`;
  if (type === 'Notebook' && book.pages) id += `-${book.pages}`;
  return id.replace(/[^a-zA-Z0-9-]/g, '');
};

const initialFilters: BookFilters = { bookName: "", subject: "", publisher: "" };

export default function CalculatorDashboard() {
  const [textbooks, setTextbooks] = useState<Book[]>([]);
  const [notebooks, setNotebooks] = useState<Book[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { user } = useUser();

  // Form state
  const [className, setClassName] = useState("12");
  const [course, setCourse] = useState("Science");
  const [initialTextbookDiscount, setInitialTextbookDiscount] = useState(10);
  const [initialTextbookTax, setInitialTextbookTax] = useState(5);
  const [initialNotebookDiscount, setInitialNotebookDiscount] = useState(15);
  const [initialNotebookTax, setInitialNotebookTax] = useState(5);
  const [currentUploadId, setCurrentUploadId] = useState<string | null>(null);

  // Publisher-specific discount states
  const [textbookSelectedPublisher, setTextbookSelectedPublisher] = useState<string | null>(null);
  const [textbookPublisherDiscount, setTextbookPublisherDiscount] = useState<number>(0);
  const [notebookSelectedPublisher, setNotebookSelectedPublisher] = useState<string | null>(null);
  const [notebookPublisherDiscount, setNotebookPublisherDiscount] = useState<number>(0);

  // Filters
  const [textbookFilters, setTextbookFilters] = useState<BookFilters>(initialFilters);
  const [notebookFilters, setNotebookFilters] = useState<BookFilters>(initialFilters);

  // Firebase data
  const frequentBookDataQuery = useMemoFirebase(() =>
    user && firestore ? collection(firestore, 'users', user.uid, 'frequent_book_data') : null
  , [firestore, user]);
  const { data: frequentBookData } = useCollection<FrequentBookData>(frequentBookDataQuery);

  const frequentBookDataMap = useMemo(() => {
    const map = new Map<string, Omit<FrequentBookData, 'id' | 'userId'>>();
    if (frequentBookData) {
      for (const item of frequentBookData) {
        const key = createBookId(item, item.type);
        map.set(key, item);
      }
    }
    return map;
  }, [frequentBookData]);

  // Price calculation
  const calculateFinalPrice = (book: Omit<Book, 'finalPrice' | 'id' | 'uploadId'>): number => {
    const priceAfterDiscount = book.price * (1 - book.discount / 100);
    return priceAfterDiscount * (1 + book.tax / 100);
  };
    // Derived state for unique publishers
  const uniqueTextbookPublishers = useMemo(() => [...new Set(textbooks.map(b => b.publisher))], [textbooks]);
  const uniqueNotebookPublishers = useMemo(() => [...new Set(notebooks.map(b => b.publisher))], [notebooks]);

  // Handle book updates
  const handleBookUpdate = (
    bookId: number | string,
    field: keyof Omit<Book, 'id' | 'finalPrice' | 'uploadId'>,
    value: string | number,
    type: 'textbook' | 'notebook'
  ) => {
    const updater = (prevBooks: Book[]) =>
      prevBooks.map(book => {
        if (book.id === bookId) {
          const updatedBook = { ...book, [field]: value };
          return { ...updatedBook, finalPrice: calculateFinalPrice(updatedBook) };
        }
        return book;
      });

    if (type === 'textbook') {
      setTextbooks(updater);
    } else {
      setNotebooks(updater);
    }
  };

  // Apply discount/tax to all books of a type
  const handleApplyAll = (field: 'discount' | 'tax', value: number, type: 'textbook' | 'notebook') => {
    const updater = (prevBooks: Book[]) =>
      prevBooks.map(book => {
        const updatedBook = { ...book, [field]: value };
        return { ...updatedBook, finalPrice: calculateFinalPrice(updatedBook) };
      });
    
    if (type === 'textbook') setTextbooks(updater);
    else setNotebooks(updater);
  };

  // Load mock data
  const handleLoadMockData = () => {
    const processBooks = (books: Book[], type: BookType, discount: number, tax: number) => {
      return books.map((book, index) => {
        const frequentMatch = frequentBookDataMap.get(createBookId(book, type));
        const finalBook = {
          ...book,
          id: `${type}-${index}`,
          discount: frequentMatch?.discount ?? discount,
          tax: frequentMatch?.tax ?? tax,
          price: frequentMatch?.price ?? book.price,
          pages: frequentMatch?.pages ?? book.pages,
        };
        return { ...finalBook, finalPrice: calculateFinalPrice(finalBook) };
      });
    };

    setTextbooks(processBooks(TEXTBOOKS_MOCK, 'Textbook', initialTextbookDiscount, initialTextbookTax));
    setNotebooks(processBooks(NOTEBOOKS_MOCK, 'Notebook', initialNotebookDiscount, initialNotebookTax));
    setIsDataLoaded(true);
    createNewUploadRecord();
    toast({ title: "Mock Data Loaded", description: "You can now edit the book details." });
  };
  
    // Reset all data
  const handleReset = () => {
    setTextbooks([]);
    setNotebooks([]);
    setIsDataLoaded(false);
    setCurrentUploadId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast({ title: "Data Cleared", description: "All book lists have been reset." });
  };
  
    // File upload handler
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const textbookSheet = workbook.Sheets['Textbooks'];
        const notebookSheet = workbook.Sheets['Notebooks'];

        if (!textbookSheet && !notebookSheet) {
          toast({ variant: "destructive", title: "Invalid File", description: "Excel file must contain 'Textbooks' or 'Notebooks' sheet." });
          return;
        }

        const parseSheet = (sheet: XLSX.WorkSheet, type: BookType) => {
          const json = XLSX.utils.sheet_to_json<any>(sheet);
          return json.map((row, index) => {
            const frequentMatch = frequentBookDataMap.get(createBookId(row, type));
            const book: Book = {
              id: `${type}-${index}`,
              bookName: row['Book Name'] || 'Unknown',
              subject: row['Subject'] || 'General',
              publisher: row['Publisher'] || 'Unknown',
              price: frequentMatch?.price ?? parseFloat(row['Price']) || 0,
              discount: frequentMatch?.discount ?? (type === 'Textbook' ? initialTextbookDiscount : initialNotebookDiscount),
              tax: frequentMatch?.tax ?? (type === 'Textbook' ? initialTextbookTax : initialNotebookTax),
              pages: frequentMatch?.pages ?? parseInt(row['Pages']) || undefined,
              finalPrice: 0,
              uploadId: ''
            };
            book.finalPrice = calculateFinalPrice(book);
            return book;
          });
        };

        if (textbookSheet) setTextbooks(parseSheet(textbookSheet, 'Textbook'));
        if (notebookSheet) setNotebooks(parseSheet(notebookSheet, 'Notebook'));
        
        setIsDataLoaded(true);
        createNewUploadRecord();
        toast({ title: "File Uploaded", description: "Book data loaded successfully from Excel." });
      } catch (error) {
        toast({ variant: "destructive", title: "Error reading file", description: "There was an issue processing the Excel file." });
        console.error(error);
      }
    };
    reader.readAsArrayBuffer(file);
  };
  
  // Total price calculations
  const totals = useMemo(() => {
    const calculate = (books: Book[]) => {
      const subtotal = books.reduce((acc, book) => acc + book.price, 0);
      const totalDiscount = books.reduce((acc, book) => acc + (book.price * book.discount / 100), 0);
      const totalTax = books.reduce((acc, book) => acc + (book.price * (1 - book.discount / 100) * book.tax / 100), 0);
      const finalTotal = books.reduce((acc, book) => acc + book.finalPrice, 0);
      return { subtotal, totalDiscount, totalTax, finalTotal };
    };
    const textbookTotals = calculate(textbooks);
    const notebookTotals = calculate(notebooks);
    const grandTotal = textbookTotals.finalTotal + notebookTotals.finalTotal;

    return { textbookTotals, notebookTotals, grandTotal };
  }, [textbooks, notebooks]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);


  // Create upload record
  const createNewUploadRecord = async () => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
      return null;
    }

    const uploadData: Omit<Upload, 'id' | 'uploadTimestamp'> & { uploadTimestamp: any } = {
      userId: user.uid,
      class: className,
      courseCombination: course,
      textbookDiscount: initialTextbookDiscount,
      textbookTax: initialTextbookTax,
      notebookDiscount: initialNotebookDiscount,
      notebookTax: initialNotebookTax,
      uploadTimestamp: serverTimestamp(),
    };

    try {
      const collectionRef = collection(firestore, 'users', user.uid, 'uploads');
      // Here we assume addDocumentNonBlocking exists and returns a promise that resolves with the doc ref
      const docRef = await addDocumentNonBlocking(collectionRef, uploadData);
      if (docRef) {
        setCurrentUploadId(docRef.id);
        toast({ title: 'New Record', description: 'Upload record created and ready for saving books.' });
        return docRef.id;
      }
      return null;
    } catch (error) {
      console.error("Error creating upload:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create upload record.' });
      return null;
    }
  };
  
    // Save all data to Firestore
  const handleSaveAllSettings = async () => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to save.' });
      return;
    }
    if (!currentUploadId) {
        toast({ variant: 'destructive', title: 'Error', description: 'No active upload session. Load data first.' });
        return;
    }

    toast({ title: 'Saving...', description: 'Saving all book data to the database.' });

    const batch = writeBatch(firestore);
    const timestamp = serverTimestamp();
    const allBooks = [...textbooks, ...notebooks];
    const processedFrequentBooks = new Set<string>();

    // 1. Save/Update frequent book data
    allBooks.forEach(book => {
      const bookType: BookType = 'pages' in book ? 'Notebook' : 'Textbook';
      const docId = createBookId(book, bookType);
      
      if (docId && !processedFrequentBooks.has(docId)) {
        const frequentDocRef = doc(firestore, 'users', user.uid, 'frequent_book_data', docId);
        const dataToSave: Omit<FrequentBookData, 'id'> = {
          userId: user.uid,
          bookName: book.bookName,
          publisher: book.publisher,
          price: book.price,
          discount: book.discount,
          tax: book.tax,
          type: bookType,
          ...(bookType === 'Notebook' && { pages: book.pages }),
        };
        batch.set(frequentDocRef, cleanFirestoreData(dataToSave), { merge: true });
        processedFrequentBooks.add(docId);
      }
    });

    // 2. Save denormalized book data to the specific upload
    textbooks.forEach(book => {
      const bookDocRef = doc(collection(firestore, 'users', user.uid, 'uploads', currentUploadId, 'textbooks'));
      const textbookData: Omit<DenormalizedBook, 'id'> & { uploadTimestamp: any } = { 
        ...book,
        uploadId: currentUploadId,
        userId: user.uid,
        class: className,
        courseCombination: course,
        uploadTimestamp: timestamp,
        type: 'Textbook'
      };
      batch.set(bookDocRef, cleanFirestoreData(textbookData));
    });

    notebooks.forEach(book => {
      const bookDocRef = doc(collection(firestore, 'users', user.uid, 'uploads', currentUploadId, 'notebooks'));
      const notebookData: Omit<DenormalizedBook, 'id'> & { uploadTimestamp: any } = { 
        ...book,
        uploadId: currentUploadId,
        userId: user.uid,
        class: className,
        courseCombination: course,
        uploadTimestamp: timestamp,
        type: 'Notebook'
      };
      batch.set(bookDocRef, cleanFirestoreData(notebookData));
    });

    try {
      await batch.commit();
      toast({ title: 'Success!', description: 'All books and frequent data have been saved successfully.' });
    } catch (error) {
      console.error('Error saving all data:', error);
      toast({ variant: 'destructive', title: 'Save Failed', description: 'An error occurred while saving the data.' });
    }
  };

    const filteredTextbooks = useMemo(() => textbooks.filter(book => 
    book.bookName.toLowerCase().includes(textbookFilters.bookName.toLowerCase()) &&
    book.subject.toLowerCase().includes(textbookFilters.subject.toLowerCase()) &&
    book.publisher.toLowerCase().includes(textbookFilters.publisher.toLowerCase())
  ), [textbooks, textbookFilters]);

  const filteredNotebooks = useMemo(() => notebooks.filter(book => 
    book.bookName.toLowerCase().includes(notebookFilters.bookName.toLowerCase()) &&
    book.subject.toLowerCase().includes(notebookFilters.subject.toLowerCase()) &&
    book.publisher.toLowerCase().includes(notebookFilters.publisher.toLowerCase())
  ), [notebooks, notebookFilters]);


  return (
    <main className="container flex-grow py-8">
      <div className="space-y-8">
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Calculator className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-3xl font-bold tracking-tight text-primary">Price Calculator</CardTitle>
                <CardDescription>Upload an Excel file or load mock data to begin.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="class-name" className="flex items-center gap-2"><GraduationCap /> Class</Label>
                <Select value={className} onValueChange={setClassName}>
                  <SelectTrigger id="class-name">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(c => (
                      <SelectItem key={c} value={String(c)}>Class {c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="course" className="flex items-center gap-2"><BookOpen /> Course Combination</Label>
                <Select value={course} onValueChange={setCourse}>
                  <SelectTrigger id="course">
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Science">Science</SelectItem>
                    <SelectItem value="Commerce">Commerce</SelectItem>
                    <SelectItem value="Arts">Arts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-4">
            <Button onClick={() => fileInputRef.current?.click()} disabled={!user}>
              <FileUp className="mr-2" /> Upload Excel
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".xlsx, .xls"
            />
            <Button onClick={handleLoadMockData} variant="secondary" disabled={!user}>
              <Tags className="mr-2" /> Load Mock Data
            </Button>
            <Button onClick={handleReset} variant="outline" disabled={!isDataLoaded}>
              <Undo2 className="mr-2" /> Reset
            </Button>
            <Button onClick={handleSaveAllSettings} className="ml-auto" disabled={!isDataLoaded || !user || !currentUploadId}>
                <Save className="mr-2" /> Save All to DB
            </Button>
          </CardFooter>
        </Card>

        {isDataLoaded && (
          <div className="space-y-8">
            <BookTable
              title="Textbooks"
              description={`Manage details for ${filteredTextbooks.length} textbooks`}
              books={filteredTextbooks}
              onBookUpdate={(id, field, value) => handleBookUpdate(id, field, value, 'textbook')}
              onApplyAll={(field, value) => handleApplyAll(field, value, 'textbook')}
              filters={textbookFilters}
              onFilterChange={setTextbookFilters}
            />

            <BookTable
              title="Notebooks"
              description={`Manage details for ${filteredNotebooks.length} notebooks`}
              books={filteredNotebooks}
              onBookUpdate={(id, field, value) => handleBookUpdate(id, field, value, 'notebook')}
              onApplyAll={(field, value) => handleApplyAll(field, value, 'notebook')}
              isNotebookTable
              filters={notebookFilters}
              onFilterChange={setNotebookFilters}
            />

            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-accent">Final Totals</CardTitle>
                    <CardDescription>A summary of all costs.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-lg bg-muted p-4">
                            <h3 className="font-semibold text-muted-foreground">Textbook Total</h3>
                            <p className="text-2xl font-bold">{formatCurrency(totals.textbookTotals.finalTotal)}</p>
                        </div>
                        <div className="rounded-lg bg-muted p-4">
                            <h3 className="font-semibold text-muted-foreground">Notebook Total</h3>
                            <p className="text-2xl font-bold">{formatCurrency(totals.notebookTotals.finalTotal)}</p>
                        </div>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between rounded-lg bg-primary/10 p-6">
                        <h3 className="text-xl font-bold text-primary">Grand Total</h3>
                        <p className="text-3xl font-extrabold text-primary">{formatCurrency(totals.grandTotal)}</p>
                    </div>
                </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
