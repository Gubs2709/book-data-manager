
"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import type { Book, FrequentBookData, BookType, BookFilters, Upload, DenormalizedBook } from "@/lib/types";
import { TEXTBOOKS_MOCK, NOTEBOOKS_MOCK } from "@/lib/data";
import { BookTable } from "./book-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calculator, Download, FileUp, Undo2, BookOpen, GraduationCap, Save, Tags, Edit, X, Check, ChevronsUpDown } from "lucide-react";
import { Separator } from "./ui/separator";
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";
import { useFirebase, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, writeBatch, serverTimestamp, Timestamp } from "firebase/firestore";
import { setDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Badge } from "./ui/badge";

const createBookId = (book: Partial<Book>, type: BookType): string => {
  let id = `${book.bookName}-${book.publisher}-${type}`;
  if (type === 'Notebook' && book.pages) {
    id += `-${book.pages}`;
  }
  return id.replace(/[^a-zA-Z0-9-]/g, '');
};

const initialFilters: BookFilters = {
    bookName: "",
    subject: "",
    publisher: "",
};

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


  // Publisher discount state
  const [textbookSelectedPublisher, setTextbookSelectedPublisher] = useState<string | null>(null);
  const [textbookPublisherDiscount, setTextbookPublisherDiscount] = useState<number>(0);
  const [notebookSelectedPublisher, setNotebookSelectedPublisher] = useState<string | null>(null);
  const [notebookPublisherDiscount, setNotebookPublisherDiscount] = useState<number>(0);

  // Filter state
  const [textbookFilters, setTextbookFilters] = useState<BookFilters>(initialFilters);
  const [notebookFilters, setNotebookFilters] = useState<BookFilters>(initialFilters);
  
  // Bulk edit state
  const [textbookBulkSelectedBooks, setTextbookBulkSelectedBooks] = useState<string[]>([]);
  const [textbookBulkPrice, setTextbookBulkPrice] = useState<string>("");
  const [textbookBulkDiscount, setTextbookBulkDiscount] = useState<string>("");
  const [textbookBulkTax, setTextbookBulkTax] = useState<string>("");
  const [isTextbookBulkPickerOpen, setIsTextbookBulkPickerOpen] = useState(false);

  const [notebookBulkSelectedBooks, setNotebookBulkSelectedBooks] = useState<string[]>([]);
  const [notebookBulkPrice, setNotebookBulkPrice] = useState<string>("");
  const [notebookBulkDiscount, setNotebookBulkDiscount] = useState<string>("");
  const [notebookBulkTax, setNotebookBulkTax] = useState<string>("");
  const [isNotebookBulkPickerOpen, setIsNotebookBulkPickerOpen] = useState(false);


  const frequentBookDataQuery = useMemoFirebase(() => 
    user && firestore ? collection(firestore, 'users', user.uid, 'frequent_book_data') : null
  , [firestore, user]);
  const { data: frequentBookData } = useCollection<FrequentBookData>(frequentBookDataQuery);

  const frequentBookDataMap = useMemo(() => {
    const map = new Map<string, Omit<FrequentBookData, 'id' | 'userId'>>();
    if (frequentBookData) {
      for (const item of frequentBookData) {
        const key = createBookId(item, item.type);
        map.set(key, {
          bookName: item.bookName,
          publisher: item.publisher,
          price: item.price,
          discount: item.discount,
          tax: item.tax,
          type: item.type,
          pages: item.pages
        });
      }
    }
    return map;
  }, [frequentBookData]);

  const calculateFinalPrice = (book: Omit<Book, 'finalPrice' | 'id' | 'uploadId'>): number => {
    const priceAfterDiscount = book.price * (1 - book.discount / 100);
    const finalPrice = priceAfterDiscount * (1 + book.tax / 100);
    return finalPrice;
  };

  const applyFrequentData = (books: Book[], type: BookType): Book[] => {
    return books.map(book => {
      const key = createBookId(book, type);
      const frequentData = frequentBookDataMap.get(key);
      if (frequentData) {
        const newBook = { 
          ...book, 
          price: frequentData.price,
          discount: frequentData.discount, 
          tax: frequentData.tax 
        };
        return { ...newBook, finalPrice: calculateFinalPrice(newBook) };
      }
      return { ...book, finalPrice: calculateFinalPrice(book) };
    });
  }

  const applyFilters = (books: Book[], filters: BookFilters): Book[] => {
    return books.filter(book => {
        return (
            book.bookName.toLowerCase().includes(filters.bookName.toLowerCase()) &&
            book.subject.toLowerCase().includes(filters.subject.toLowerCase()) &&
            book.publisher.toLowerCase().includes(filters.publisher.toLowerCase())
        );
    });
  };

  const filteredTextbooks = useMemo(() => {
    return applyFilters(textbooks, textbookFilters);
  }, [textbooks, textbookFilters]);

  const filteredNotebooks = useMemo(() => {
    return applyFilters(notebooks, notebookFilters);
  }, [notebooks, notebookFilters]);


  const totals = useMemo(() => {
    const textbookTotal = filteredTextbooks.reduce((sum, book) => sum + book.finalPrice, 0);
    const notebookTotal = filteredNotebooks.reduce((sum, book) => sum + book.finalPrice, 0);
    const grandTotal = textbookTotal + notebookTotal;
    return { textbookTotal, notebookTotal, grandTotal };
  }, [filteredTextbooks, filteredNotebooks]);

  const textbookPublishers = useMemo(() => {
    const currentPublishers = textbooks.map(book => book.publisher);
    const frequentPublishers = frequentBookData?.filter(i => i.type === 'Textbook').map(item => item.publisher) || [];
    return [...new Set([...currentPublishers, ...frequentPublishers])].filter(Boolean).sort();
  }, [textbooks, frequentBookData]);

  const notebookPublishers = useMemo(() => {
    const currentPublishers = notebooks.map(book => book.publisher);
    const frequentPublishers = frequentBookData?.filter(i => i.type === 'Notebook').map(item => item.publisher) || [];
    return [...new Set([...currentPublishers, ...frequentPublishers])].filter(Boolean).sort();
  }, [notebooks, frequentBookData]);
  
  const textbookNames = useMemo(() => {
    const currentBookNames = textbooks.map(book => book.bookName);
    const frequentBookNames = frequentBookData?.filter(i => i.type === 'Textbook').map(item => item.bookName) || [];
    return [...new Set([...currentBookNames, ...frequentBookNames])].filter(Boolean).sort();
  }, [textbooks, frequentBookData]);
  
  const notebookNames = useMemo(() => {
    const currentBookNames = notebooks.map(book => book.bookName);
    const frequentBookNames = frequentBookData?.filter(i => i.type === 'Notebook').map(item => item.bookName) || [];
    return [...new Set([...currentBookNames, ...frequentBookNames])].filter(Boolean).sort();
  }, [notebooks, frequentBookData]);

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
      const docRef = await addDocumentNonBlocking(collectionRef, uploadData);
      if (docRef) {
        setCurrentUploadId(docRef.id);
        toast({ title: 'New Record', description: 'A new upload record has been created.' });
        return docRef.id;
      }
      return null;
    } catch (error) {
      console.error("Error creating new upload record:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create a new upload record.' });
      return null;
    }
  };


  const processAndLoadData = async (
    textbookData: Omit<Book, 'uploadId'>[], 
    notebookData: Omit<Book, 'uploadId'>[],
  ) => {
    const uploadId = await createNewUploadRecord();
    if (!uploadId) return;

    const applyInitialValues = (books: Omit<Book, 'uploadId'>[], discount: number, tax: number) =>
      books.map((book) => {
        const newBook = { ...book, discount, tax, uploadId };
        return { ...newBook, finalPrice: calculateFinalPrice(newBook) };
      });

    let processedTextbooks = applyInitialValues(textbookData, initialTextbookDiscount, initialTextbookTax);
    let processedNotebooks = applyInitialValues(notebookData, initialNotebookDiscount, initialNotebookTax);
    
    if (frequentBookDataMap.size > 0) {
      processedTextbooks = applyFrequentData(processedTextbooks, 'Textbook');
      processedNotebooks = applyFrequentData(processedNotebooks, 'Notebook');
    }

    setTextbooks(processedTextbooks);
    setNotebooks(processedNotebooks);
    setIsDataLoaded(true);
  }

  const handleProcessMockData = () => {
    processAndLoadData(TEXTBOOKS_MOCK, NOTEBOOKS_MOCK);
    toast({ title: "Success", description: "Mock data loaded successfully." });
  };
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        
        const textbookSheet = workbook.Sheets['Textbooks'];
        const notebookSheet = workbook.Sheets['Notebooks'];

        if (!textbookSheet && !notebookSheet) {
          throw new Error("Excel file must contain 'Textbooks' and/or 'Notebooks' sheets.");
        }

        const parseSheet = (sheet: XLSX.WorkSheet): Omit<Book, 'uploadId'>[] => {
            if (!sheet) return [];
            const jsonData = XLSX.utils.sheet_to_json<any>(sheet);
            let parsedBooks = jsonData.map((row, index) => ({
                id: row.id || index + 1,
                bookName: row.bookName || '',
                subject: row.subject || 'N/A',
                publisher: row.publisher || 'N/A',
                price: parseFloat(row.price) || 0,
                pages: row.pages ? parseInt(row.pages) : undefined,
                discount: 0,
                tax: 0,
                finalPrice: 0,
            }));
            return parsedBooks;
        };

        const loadedTextbooks = parseSheet(textbookSheet);
        const loadedNotebooks = parseSheet(notebookSheet);
        
        processAndLoadData(loadedTextbooks, loadedNotebooks);
        toast({ title: "Success", description: "Excel file processed successfully." });

      } catch (error: any) {
        console.error("Error processing Excel file:", error);
        toast({ variant: 'destructive', title: "Error", description: error.message || "Failed to process Excel file." });
        setIsDataLoaded(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleReset = () => {
    setIsDataLoaded(false);
    setTextbooks([]);
    setNotebooks([]);
    setCurrentUploadId(null);
    setTextbookFilters(initialFilters);
    setNotebookFilters(initialFilters);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }

  const saveFrequentBookData = (book: Book, type: BookType) => {
    if (!user || !firestore) return;
    const docId = createBookId(book, type);
    if (!docId) return;

    const docRef = doc(firestore, 'users', user.uid, 'frequent_book_data', docId);

    const dataToSave: Omit<FrequentBookData, 'id'> = {
      userId: user.uid,
      bookName: book.bookName,
      publisher: book.publisher,
      price: book.price,
      discount: book.discount,
      tax: book.tax,
      type: type,
      ...(type === 'Notebook' && { pages: book.pages }),
    };
    setDocumentNonBlocking(docRef, dataToSave, { merge: true });
  }
  
  const handleUpdateBook = (table: 'textbooks' | 'notebooks', bookId: number | string, field: keyof Omit<Book, 'id' | 'finalPrice' | 'uploadId'>, value: string | number) => {
    const updater = table === 'textbooks' ? setTextbooks : setNotebooks;
    const bookType = table === 'textbooks' ? 'Textbook' : 'Notebook';
    updater(prevBooks =>
      prevBooks.map(book => {
        if (book.id === bookId) {
          const updatedBook = { ...book, [field]: value };
          saveFrequentBookData(updatedBook, bookType);
          return { ...updatedBook, finalPrice: calculateFinalPrice(updatedBook) };
        }
        return book;
      })
    );
  };

  const handleApplyAll = (table: 'textbooks' | 'notebooks', field: 'discount' | 'tax', value: number) => {
    const updater = table === 'textbooks' ? setTextbooks : setNotebooks;
    const bookType = table === 'textbooks' ? 'Textbook' : 'Notebook';
    updater(prevBooks =>
      prevBooks.map(book => {
        const updatedBook = { ...book, [field]: value };
        saveFrequentBookData(updatedBook, bookType);
        return { ...updatedBook, finalPrice: calculateFinalPrice(updatedBook) };
      })
    );
  };

  const handleApplyPublisherDiscount = (type: BookType) => {
    const selectedPublisher = type === 'Textbook' ? textbookSelectedPublisher : notebookSelectedPublisher;
    const publisherDiscount = type === 'Textbook' ? textbookPublisherDiscount : notebookPublisherDiscount;
    const updater = type === 'Textbook' ? setTextbooks : setNotebooks;

    if (!selectedPublisher || publisherDiscount === null) {
      toast({ variant: 'destructive', title: "Error", description: "Please select a publisher and enter a discount value." });
      return;
    }

    const updateBooksWithPublisherDiscount = (prevBooks: Book[]): Book[] =>
      prevBooks.map(book => {
        if (book.publisher === selectedPublisher) {
          const updatedBook = { ...book, discount: publisherDiscount };
          saveFrequentBookData(updatedBook, type);
          return { ...updatedBook, finalPrice: calculateFinalPrice(updatedBook) };
        }
        return book;
      });

    updater(prev => updateBooksWithPublisherDiscount(prev));

    toast({ title: "Success", description: `Applied ${publisherDiscount}% discount to all ${type.toLowerCase()}s by ${selectedPublisher}.` });
  };
  
  const handleBulkUpdate = (type: BookType) => {
    const bookNamesToUpdate = (type === 'Textbook' ? textbookBulkSelectedBooks : notebookBulkSelectedBooks).map(name => name.trim().toLowerCase());
    const updater = type === 'Textbook' ? setTextbooks : setNotebooks;

    if (bookNamesToUpdate.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "Please select at least one book." });
      return;
    }

    const newPrice = type === 'Textbook' ? (textbookBulkPrice !== "" ? parseFloat(textbookBulkPrice) : null) : (notebookBulkPrice !== "" ? parseFloat(notebookBulkPrice) : null);
    const newDiscount = type === 'Textbook' ? (textbookBulkDiscount !== "" ? parseFloat(textbookBulkDiscount) : null) : (notebookBulkDiscount !== "" ? parseFloat(notebookBulkDiscount) : null);
    const newTax = type === 'Textbook' ? (textbookBulkTax !== "" ? parseFloat(textbookBulkTax) : null) : (notebookBulkTax !== "" ? parseFloat(notebookBulkTax) : null);


    if (newPrice === null && newDiscount === null && newTax === null) {
      toast({ variant: "destructive", title: "Error", description: "Please enter a value for price, discount, or tax to apply." });
      return;
    }

    let booksUpdatedCount = 0;

    const updateBookList = (books: Book[]): Book[] => {
      return books.map(book => {
        if (bookNamesToUpdate.includes(book.bookName.trim().toLowerCase())) {
          let updatedBook = { ...book };
          if (newPrice !== null && !isNaN(newPrice)) updatedBook.price = newPrice;
          if (newDiscount !== null && !isNaN(newDiscount)) updatedBook.discount = newDiscount;
          if (newTax !== null && !isNaN(newTax)) updatedBook.tax = newTax;
          
          saveFrequentBookData(updatedBook, type);
          booksUpdatedCount++;
          return { ...updatedBook, finalPrice: calculateFinalPrice(updatedBook) };
        }
        return book;
      });
    };
    
    updater(prev => updateBookList(prev));

    if (booksUpdatedCount > 0) {
      toast({ title: "Success", description: `Updated ${booksUpdatedCount} ${type.toLowerCase()}(s).` });
      if (type === 'Textbook') {
        setTextbookBulkSelectedBooks([]);
        setTextbookBulkPrice("");
        setTextbookBulkDiscount("");
        setTextbookBulkTax("");
      } else {
        setNotebookBulkSelectedBooks([]);
        setNotebookBulkPrice("");
        setNotebookBulkDiscount("");
        setNotebookBulkTax("");
      }
    } else {
      toast({ variant: "destructive", title: "No books found", description: `No ${type.toLowerCase()}s matched the names provided.` });
    }
  };


  const handleDownload = () => {
    const fileName = `${className}_${course}_EduBook_Calculated.xlsx`;
    
    const textbookSheetData = filteredTextbooks.map(book => ({
      'Book Name': book.bookName,
      'Subject': book.subject,
      'Publisher': book.publisher,
      'Price': book.price,
      'Discount (%)': book.discount,
      'Tax (%)': book.tax,
      'Final Price': book.finalPrice,
    }));

    const notebookSheetData = filteredNotebooks.map(book => ({
      'Book Name': book.bookName,
      'Subject': book.subject,
      'Publisher': book.publisher,
      'Pages': book.pages,
      'Price': book.price,
      'Discount (%)': book.discount,
      'Tax (%)': book.tax,
      'Final Price': book.finalPrice,
    }));

    const wb = XLSX.utils.book_new();
    const wsTextbooks = XLSX.utils.json_to_sheet(textbookSheetData);
    const wsNotebooks = XLSX.utils.json_to_sheet(notebookSheetData);
    
    XLSX.utils.book_append_sheet(wb, wsTextbooks, "Textbooks");
    XLSX.utils.book_append_sheet(wb, wsNotebooks, "Notebooks");

    XLSX.writeFile(wb, fileName);
    toast({ title: "Success", description: "Excel file has been downloaded." });
  }

  const handleSaveAllSettings = async () => {
    if (!user || !firestore || !currentUploadId) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in and have an active upload session.' });
      return;
    }
  
    const batch = writeBatch(firestore);
    const timestamp = serverTimestamp();
  
    // Save all books from the current session to the frequent_book_data collection
    const allBooks = [...textbooks, ...notebooks];
    const processedFrequentBooks = new Set<string>();
  
    allBooks.forEach(book => {
      const bookType = 'uploadId' in book && textbooks.some(tb => tb.id === book.id) ? 'Textbook' : 'Notebook';
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
        batch.set(frequentDocRef, dataToSave, { merge: true });
        processedFrequentBooks.add(docId);
      }
    });

    // Save the individual books under the current upload with denormalized data
    textbooks.forEach(book => {
      const bookDocRef = doc(collection(firestore, 'users', user.uid, 'uploads', currentUploadId, 'textbooks'));
      const textbookData: DenormalizedBook = { 
        ...book, 
        id: bookDocRef.id,
        uploadId: currentUploadId,
        class: className,
        courseCombination: course,
        uploadTimestamp: timestamp
      };
      batch.set(bookDocRef, textbookData);
    });

    notebooks.forEach(book => {
      const bookDocRef = doc(collection(firestore, 'users', user.uid, 'uploads', currentUploadId, 'notebooks'));
      const notebookData: DenormalizedBook = { 
        ...book, 
        id: bookDocRef.id,
        uploadId: currentUploadId,
        class: className,
        courseCombination: course,
        uploadTimestamp: timestamp
       };
      batch.set(bookDocRef, notebookData);
    });
  
    try {
      await batch.commit();
      toast({ title: "Success", description: "All book settings and current list saved successfully." });
    } catch (error: any) {
      console.error("Error saving all settings:", error);
      toast({ variant: 'destructive', title: "Error", description: "Failed to save all settings." });
    }
  }
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(value);
  };

  useEffect(() => {
    if (user === null) {
      // Potentially handle anonymous sign-in here if desired
    }
  }, [user]);


  return (
    <main className="container flex-grow py-8">
      {!isDataLoaded ? (
        <div className="mx-auto max-w-2xl animate-in fade-in-50 duration-500">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-bold tracking-tight text-primary">Setup Calculation</CardTitle>
              <CardDescription>
                Enter metadata and default values before processing the book list.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="class">Class</Label>
                  <Select value={className} onValueChange={setClassName}>
                    <SelectTrigger id="class" className="w-full">
                      <SelectValue placeholder="Select Class" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((c) => (
                        <SelectItem key={c} value={String(c)}>Class {c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="course">Course Combination</Label>
                  <Input id="course" value={course} onChange={(e) => setCourse(e.target.value)} placeholder="e.g., Science" />
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-4 rounded-lg border bg-card p-4 shadow-sm">
                  <h3 className="font-semibold text-primary">Textbooks</h3>
                  <div className="space-y-2">
                    <Label htmlFor="tb-discount">Default Discount (%)</Label>
                    <Input id="tb-discount" type="number" value={initialTextbookDiscount} onChange={(e) => setInitialTextbookDiscount(parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tb-tax">Default Tax (%)</Label>
                    <Input id="tb-tax" type="number" value={initialTextbookTax} onChange={(e) => setInitialTextbookTax(parseFloat(e.target.value) || 0)} />
                  </div>
                </div>
                <div className="space-y-4 rounded-lg border bg-card p-4 shadow-sm">
                  <h3 className="font-semibold text-primary">Notebooks</h3>
                  <div className="space-y-2">
                    <Label htmlFor="nb-discount">Default Discount (%)</Label>
                    <Input id="nb-discount" type="number" value={initialNotebookDiscount} onChange={(e) => setInitialNotebookDiscount(parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nb-tax">Default Tax (%)</Label>
                    <Input id="nb-tax" type="number" value={initialNotebookTax} onChange={(e) => setInitialNotebookTax(parseFloat(e.target.value) || 0)} />
                  </div>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                  <Label htmlFor="excel-upload">Upload Book List (Excel)</Label>
                  <Input id="excel-upload" type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                  <p className="text-xs text-muted-foreground">
                      Your Excel file should have two sheets: "Textbooks" and "Notebooks". Each sheet should contain columns: 'bookName', 'subject', 'publisher', 'price', and for notebooks, 'pages'.
                  </p>
              </div>
            </CardContent>
            <CardFooter>
               <Button size="lg" className="w-full font-bold" onClick={handleProcessMockData}>
                <FileUp className="mr-2 h-4 w-4" /> Use Mock Data Instead
              </Button>
            </CardFooter>
          </Card>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in-50 duration-500">
          <Card className="shadow-md">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-lg font-semibold">
                          <GraduationCap className="h-6 w-6 text-primary" />
                          <span>Class {className}</span>
                      </div>
                      <Separator orientation="vertical" className="h-6"/>
                      <div className="flex items-center gap-2 text-lg font-semibold">
                          <BookOpen className="h-6 w-6 text-primary" />
                          <span>{course}</span>
                      </div>
                  </div>
                  <Button onClick={handleSaveAllSettings}>
                    <Save className="mr-2 h-4 w-4" /> Save All Settings
                  </Button>
              </CardContent>
          </Card>

          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-primary mb-4">Textbook Tools</h2>
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <Card className="shadow-md">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Tags className="h-5 w-5 text-primary"/>
                      Publisher-Specific Discount
                    </CardTitle>
                    <CardDescription>Apply a discount to all textbooks from a single publisher.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <Select onValueChange={setTextbookSelectedPublisher} value={textbookSelectedPublisher || ''}>
                            <SelectTrigger className="w-full sm:w-[250px]">
                                <SelectValue placeholder="Select Publisher" />
                            </SelectTrigger>
                            <SelectContent>
                                {textbookPublishers.map((pub) => (
                                    <SelectItem key={pub} value={pub}>{pub}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input
                            type="number"
                            placeholder="Discount %"
                            className="w-full sm:w-[150px]"
                            value={textbookPublisherDiscount}
                            onChange={(e) => setTextbookPublisherDiscount(parseFloat(e.target.value) || 0)}
                            aria-label="Textbook Publisher Discount"
                        />
                        <Button onClick={() => handleApplyPublisherDiscount('Textbook')} className="w-full sm:w-auto">
                            Apply Discount
                        </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-md">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Edit className="h-5 w-5 text-primary"/>
                      Bulk Textbook Editor
                    </CardTitle>
                    <CardDescription>Apply changes to multiple textbooks by name.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Book Names</Label>
                      <Popover open={isTextbookBulkPickerOpen} onOpenChange={setIsTextbookBulkPickerOpen}>
                          <PopoverTrigger asChild>
                              <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={isTextbookBulkPickerOpen}
                                  className="w-full justify-between h-auto"
                              >
                                  <div className="flex flex-wrap gap-1">
                                      {textbookBulkSelectedBooks.length > 0 ? textbookBulkSelectedBooks.map(book => (
                                          <Badge key={book} variant="secondary" className="mr-1">
                                              {book}
                                              <div
                                                  role="button"
                                                  tabIndex={0}
                                                  className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                                  onClick={(e) => {
                                                      e.preventDefault();
                                                      e.stopPropagation();
                                                      setTextbookBulkSelectedBooks(textbookBulkSelectedBooks.filter(b => b !== book));
                                                  }}
                                                  onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                      e.preventDefault();
                                                      e.stopPropagation();
                                                      setTextbookBulkSelectedBooks(textbookBulkSelectedBooks.filter(b => b !== book));
                                                    }
                                                  }}
                                              >
                                                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                              </div>
                                          </Badge>
                                      )) : "Select textbooks..."}
                                  </div>
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                              <Command>
                                  <CommandInput placeholder="Search textbook..." />
                                  <CommandList>
                                      <CommandEmpty>No book found.</CommandEmpty>
                                      <CommandGroup>
                                          {textbookNames.map((book) => (
                                              <CommandItem
                                                  key={book}
                                                  value={book}
                                                  onSelect={(currentValue) => {
                                                      setTextbookBulkSelectedBooks(
                                                          textbookBulkSelectedBooks.includes(currentValue)
                                                              ? textbookBulkSelectedBooks.filter(b => b !== currentValue)
                                                              : [...textbookBulkSelectedBooks, currentValue]
                                                      )
                                                  }}
                                              >
                                                  <Check
                                                      className={`mr-2 h-4 w-4 ${textbookBulkSelectedBooks.includes(book) ? "opacity-100" : "opacity-0"}`}
                                                  />
                                                  {book}
                                              </CommandItem>
                                          ))}
                                      </CommandGroup>
                                  </CommandList>
                              </Command>
                          </PopoverContent>
                      </Popover>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="textbook-bulk-price">New Price</Label>
                            <Input id="textbook-bulk-price" type="number" placeholder="e.g., 150" value={textbookBulkPrice} onChange={e => setTextbookBulkPrice(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="textbook-bulk-discount">New Discount (%)</Label>
                            <Input id="textbook-bulk-discount" type="number" placeholder="e.g., 15" value={textbookBulkDiscount} onChange={e => setTextbookBulkDiscount(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="textbook-bulk-tax">New Tax (%)</Label>
                            <Input id="textbook-bulk-tax" type="number" placeholder="e.g., 5" value={textbookBulkTax} onChange={e => setTextbookBulkTax(e.target.value)} />
                        </div>
                    </div>
                    <Button onClick={() => handleBulkUpdate('Textbook')} className="w-full sm:w-auto mt-4">
                        Apply Bulk Changes
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

             <BookTable
               title="Textbooks"
               description="List of textbooks for the selected class."
               books={filteredTextbooks}
               onBookUpdate={(id, field, value) => handleUpdateBook('textbooks', id, field, value)}
               onApplyAll={(field, value) => handleApplyAll('textbooks', field, value)}
               filters={textbookFilters}
               onFilterChange={setTextbookFilters}
             />
          </div>

          <Separator className="my-8" />
          
          <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-primary mb-4">Notebook Tools</h2>
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                  <Card className="shadow-md">
                    <CardHeader>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Tags className="h-5 w-5 text-primary"/>
                        Publisher-Specific Discount
                      </CardTitle>
                      <CardDescription>Apply a discount to all notebooks from a single publisher.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                          <Select onValueChange={setNotebookSelectedPublisher} value={notebookSelectedPublisher || ''}>
                              <SelectTrigger className="w-full sm:w-[250px]">
                                  <SelectValue placeholder="Select Publisher" />
                              </SelectTrigger>
                              <SelectContent>
                                  {notebookPublishers.map((pub) => (
                                      <SelectItem key={pub} value={pub}>{pub}</SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                          <Input
                              type="number"
                              placeholder="Discount %"
                              className="w-full sm:w-[150px]"
                              value={notebookPublisherDiscount}
                              onChange={(e) => setNotebookPublisherDiscount(parseFloat(e.target.value) || 0)}
                              aria-label="Notebook Publisher Discount"
                          />
                          <Button onClick={() => handleApplyPublisherDiscount('Notebook')} className="w-full sm:w-auto">
                              Apply Discount
                          </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-md">
                    <CardHeader>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Edit className="h-5 w-5 text-primary"/>
                        Bulk Notebook Editor
                      </CardTitle>
                      <CardDescription>Apply changes to multiple notebooks by name.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Book Names</Label>
                        <Popover open={isNotebookBulkPickerOpen} onOpenChange={setIsNotebookBulkPickerOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={isNotebookBulkPickerOpen}
                                    className="w-full justify-between h-auto"
                                >
                                    <div className="flex flex-wrap gap-1">
                                        {notebookBulkSelectedBooks.length > 0 ? notebookBulkSelectedBooks.map(book => (
                                            <Badge key={book} variant="secondary" className="mr-1">
                                                {book}
                                                <div
                                                    role="button"
                                                    tabIndex={0}
                                                    className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setNotebookBulkSelectedBooks(notebookBulkSelectedBooks.filter(b => b !== book));
                                                    }}
                                                    onKeyDown={(e) => {
                                                      if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setNotebookBulkSelectedBooks(notebookBulkSelectedBooks.filter(b => b !== book));
                                                      }
                                                    }}
                                                >
                                                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                                </div>
                                            </Badge>
                                        )) : "Select notebooks..."}
                                    </div>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                    <CommandInput placeholder="Search notebook..." />
                                    <CommandList>
                                        <CommandEmpty>No book found.</CommandEmpty>
                                        <CommandGroup>
                                            {notebookNames.map((book) => (
                                                <CommandItem
                                                    key={book}
                                                    value={book}
                                                    onSelect={(currentValue) => {
                                                        setNotebookBulkSelectedBooks(
                                                            notebookBulkSelectedBooks.includes(currentValue)
                                                                ? notebookBulkSelectedBooks.filter(b => b !== currentValue)
                                                                : [...notebookBulkSelectedBooks, currentValue]
                                                        )
                                                    }}
                                                >
                                                    <Check
                                                        className={`mr-2 h-4 w-4 ${notebookBulkSelectedBooks.includes(book) ? "opacity-100" : "opacity-0"}`}
                                                    />
                                                    {book}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-2">
                              <Label htmlFor="notebook-bulk-price">New Price</Label>
                              <Input id="notebook-bulk-price" type="number" placeholder="e.g., 50" value={notebookBulkPrice} onChange={e => setNotebookBulkPrice(e.target.value)} />
                          </div>
                          <div className="space-y-2">
                              <Label htmlFor="notebook-bulk-discount">New Discount (%)</Label>
                              <Input id="notebook-bulk-discount" type="number" placeholder="e.g., 20" value={notebookBulkDiscount} onChange={e => setNotebookBulkDiscount(e.target.value)} />
                          </div>
                          <div className="space-y-2">
                              <Label htmlFor="notebook-bulk-tax">New Tax (%)</Label>
                              <Input id="notebook-bulk-tax" type="number" placeholder="e.g., 5" value={notebookBulkTax} onChange={e => setNotebookBulkTax(e.target.value)} />
                          </div>
                      </div>
                      <Button onClick={() => handleBulkUpdate('Notebook')} className="w-full sm:w-auto mt-4">
                          Apply Bulk Changes
                      </Button>
                    </CardContent>
                  </Card>
                </div>
            </div>

             <BookTable
               title="Notebooks"
               description="List of notebooks and other stationery."
               books={filteredNotebooks}
               onBookUpdate={(id, field, value) => handleUpdateBook('notebooks', id, field, value)}
               onApplyAll={(field, value) => handleApplyAll('notebooks', field, value)}
               isNotebookTable={true}
               filters={notebookFilters}
               onFilterChange={setNotebookFilters}
             />
          </div>
          
           <Card className="shadow-lg mt-8">
            <CardHeader>
                <CardTitle>Calculation Summary</CardTitle>
                <CardDescription>A summary of the calculated totals.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="flex flex-col space-y-1.5 rounded-lg border bg-secondary/50 p-4">
                    <Label>Textbooks Total</Label>
                    <p className="text-2xl font-bold">{formatCurrency(totals.textbookTotal)}</p>
                </div>
                <div className="flex flex-col space-y-1.5 rounded-lg border bg-secondary/50 p-4">
                    <Label>Notebooks Total</Label>
                    <p className="text-2xl font-bold">{formatCurrency(totals.notebookTotal)}</p>
                </div>
                <div className="flex flex-col space-y-1.5 rounded-lg border bg-primary/10 p-4">
                    <Label className="text-primary">Grand Total</Label>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(totals.grandTotal)}</p>
                </div>
            </CardContent>
           </Card>
        </div>
      )}
      
      {isDataLoaded && (
        <footer className="sticky bottom-0 z-40 mt-auto border-t bg-background/95 py-4 backdrop-blur-sm">
          <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm md:gap-6 md:text-base">
                 <div className="flex items-baseline gap-2">
                    <Calculator className="h-5 w-5 text-muted-foreground"/>
                    <span className="text-muted-foreground">Grand Total:</span>
                    <span className="font-bold text-lg text-primary">{formatCurrency(totals.grandTotal)}</span>
                </div>
            </div>
            <div className="flex w-full shrink-0 gap-2 sm:w-auto">
                <Button variant="outline" onClick={handleReset} className="flex-1">
                    <Undo2 className="mr-2 h-4 w-4" /> Reset
                </Button>
                <Button onClick={handleDownload} className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90">
                    <Download className="mr-2 h-4 w-4" /> Download
                </Button>
            </div>
          </div>
        </footer>
      )}
    </main>
  );
}
