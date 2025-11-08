
"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import type { Book, FrequentBookData, BookType } from "@/lib/types";
import { TEXTBOOKS_MOCK, NOTEBOOKS_MOCK } from "@/lib/data";
import { BookTable } from "./book-table";
import Header from "./header";
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
import { Calculator, Download, FileUp, Undo2, BookOpen, GraduationCap, Save, Tags } from "lucide-react";
import { Separator } from "./ui/separator";
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";
import { useFirebase, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, writeBatch } from "firebase/firestore";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";

const createBookId = (book: Partial<Book>, type: BookType): string => {
  let id = `${book.bookName}-${book.publisher}-${type}`;
  if (type === 'Notebook' && book.pages) {
    id += `-${book.pages}`;
  }
  return id.replace(/[^a-zA-Z0-9-]/g, '');
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

  // Publisher discount state
  const [selectedPublisher, setSelectedPublisher] = useState<string | null>(null);
  const [publisherDiscount, setPublisherDiscount] = useState<number>(0);

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

  const calculateFinalPrice = (book: Omit<Book, 'finalPrice' | 'id'>): number => {
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

  const totals = useMemo(() => {
    const textbookTotal = textbooks.reduce((sum, book) => sum + book.finalPrice, 0);
    const notebookTotal = notebooks.reduce((sum, book) => sum + book.finalPrice, 0);
    const grandTotal = textbookTotal + notebookTotal;
    return { textbookTotal, notebookTotal, grandTotal };
  }, [textbooks, notebooks]);

  const uniquePublishers = useMemo(() => {
    const currentPublishers = [...textbooks, ...notebooks].map(book => book.publisher);
    const frequentPublishers = frequentBookData?.map(item => item.publisher) || [];
    const allPublishers = [...currentPublishers, ...frequentPublishers];
    return [...new Set(allPublishers)].filter(Boolean).sort();
  }, [textbooks, notebooks, frequentBookData]);

  const handleProcessMockData = () => {
    const applyInitialValues = (mockData: Book[], discount: number, tax: number) =>
      mockData.map((book) => {
        const newBook = { ...book, discount, tax };
        return { ...newBook, finalPrice: calculateFinalPrice(newBook) };
      });

    let processedTextbooks = applyInitialValues(TEXTBOOKS_MOCK, initialTextbookDiscount, initialTextbookTax);
    let processedNotebooks = applyInitialValues(NOTEBOOKS_MOCK, initialNotebookDiscount, initialNotebookTax);
    
    if (frequentBookDataMap.size > 0) {
      processedTextbooks = applyFrequentData(processedTextbooks, 'Textbook');
      processedNotebooks = applyFrequentData(processedNotebooks, 'Notebook');
    }

    setTextbooks(processedTextbooks);
    setNotebooks(processedNotebooks);
    setIsDataLoaded(true);
    toast({ title: "Success", description: "Mock data loaded successfully." });
  };
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

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

        const parseSheet = (sheet: XLSX.WorkSheet, discount: number, tax: number, type: BookType): Book[] => {
            if (!sheet) return [];
            const jsonData = XLSX.utils.sheet_to_json<any>(sheet);
            let parsedBooks = jsonData.map((row, index) => {
                const book: Book = {
                    id: row.id || index + 1,
                    bookName: row.bookName || '',
                    subject: row.subject || 'N/A',
                    publisher: row.publisher || 'N/A',
                    price: parseFloat(row.price) || 0,
                    pages: type === 'Notebook' ? parseInt(row.pages) || undefined : undefined,
                    discount,
                    tax,
                    finalPrice: 0,
                };
                 const key = createBookId(book, type);
                 const frequentData = frequentBookDataMap.get(key);
                 if (frequentData) {
                    book.price = frequentData.price;
                    book.discount = frequentData.discount;
                    book.tax = frequentData.tax;
                 }
                book.finalPrice = calculateFinalPrice(book);
                return book;
            });
            return parsedBooks;
        };

        const loadedTextbooks = parseSheet(textbookSheet, initialTextbookDiscount, initialTextbookTax, 'Textbook');
        const loadedNotebooks = parseSheet(notebookSheet, initialNotebookDiscount, initialNotebookTax, 'Notebook');
        
        setTextbooks(loadedTextbooks);
        setNotebooks(loadedNotebooks);
        setIsDataLoaded(true);
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
  
  const handleUpdateBook = (table: 'textbooks' | 'notebooks', bookId: number, field: keyof Omit<Book, 'id' | 'finalPrice'>, value: string | number) => {
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

  const handleApplyPublisherDiscount = () => {
    if (!selectedPublisher || publisherDiscount === null) {
      toast({ variant: 'destructive', title: "Error", description: "Please select a publisher and enter a discount value." });
      return;
    }

    const updateBooksWithPublisherDiscount = (prevBooks: Book[], type: BookType): Book[] => 
      prevBooks.map(book => {
        if (book.publisher === selectedPublisher) {
          const updatedBook = { ...book, discount: publisherDiscount };
          saveFrequentBookData(updatedBook, type);
          return { ...updatedBook, finalPrice: calculateFinalPrice(updatedBook) };
        }
        return book;
      });
    
    setTextbooks(prev => updateBooksWithPublisherDiscount(prev, 'Textbook'));
    setNotebooks(prev => updateBooksWithPublisherDiscount(prev, 'Notebook'));

    toast({ title: "Success", description: `Applied ${publisherDiscount}% discount to all books by ${selectedPublisher}.` });
  };


  const handleDownload = () => {
    const fileName = `${className}_${course}_EduBook_Calculated.xlsx`;
    
    const textbookSheetData = textbooks.map(book => ({
      'Book Name': book.bookName,
      'Subject': book.subject,
      'Publisher': book.publisher,
      'Price': book.price,
      'Discount (%)': book.discount,
      'Tax (%)': book.tax,
      'Final Price': book.finalPrice,
    }));

    const notebookSheetData = notebooks.map(book => ({
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
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to save settings.' });
      return;
    }

    const batch = writeBatch(firestore);
    
    const allBooks = [...textbooks, ...notebooks];
    const processedBooks = new Set<string>();

    allBooks.forEach(book => {
      const bookType = textbooks.includes(book) ? 'Textbook' : 'Notebook';
      const docId = createBookId(book, bookType);
      
      if (!processedBooks.has(docId)) {
        const docRef = doc(firestore, 'users', user.uid, 'frequent_book_data', docId);
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
        batch.set(docRef, dataToSave, { merge: true });
        processedBooks.add(docId);
      }
    });

    try {
      await batch.commit();
      toast({ title: "Success", description: "All book settings saved successfully." });
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
    <>
      <Header />
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

            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Tags className="h-5 w-5 text-primary"/>
                  Publisher-Specific Discount
                </CardTitle>
                <CardDescription>Apply a discount to all books from a single publisher.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <Select onValueChange={setSelectedPublisher} value={selectedPublisher || ''}>
                        <SelectTrigger className="w-full sm:w-[250px]">
                            <SelectValue placeholder="Select Publisher" />
                        </SelectTrigger>
                        <SelectContent>
                            {uniquePublishers.map((pub) => (
                                <SelectItem key={pub} value={pub}>{pub}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Input
                        type="number"
                        placeholder="Discount %"
                        className="w-full sm:w-[150px]"
                        value={publisherDiscount}
                        onChange={(e) => setPublisherDiscount(parseFloat(e.target.value) || 0)}
                        aria-label="Publisher Discount"
                    />
                    <Button onClick={handleApplyPublisherDiscount} className="w-full sm:w-auto">
                        Apply Discount
                    </Button>
                </div>
              </CardContent>
            </Card>

             <div className="space-y-8">
               <BookTable
                 title="Textbooks"
                 description="List of textbooks for the selected class."
                 books={textbooks}
                 onBookUpdate={(id, field, value) => handleUpdateBook('textbooks', id, field, value)}
                 onApplyAll={(field, value) => handleApplyAll('textbooks', field, value)}
               />
               <BookTable
                 title="Notebooks"
                 description="List of notebooks and other stationery."
                 books={notebooks}
                 onBookUpdate={(id, field, value) => handleUpdateBook('notebooks', id, field, value)}
                 onApplyAll={(field, value) => handleApplyAll('notebooks', field, value)}
                 isNotebookTable={true}
               />
               <Card className="shadow-lg">
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
          </div>
        )}
      </main>
      
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
    </>
  );
}
