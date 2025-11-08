"use client";

import { useState, useMemo, useRef } from "react";
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
import { FileUp, Save, GraduationCap } from "lucide-react";
import { Separator } from "./ui/separator";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { useFirebase, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";

// 🧹 Clean data before Firestore
function cleanFirestoreData<T extends Record<string, any>>(data: T): T {
  const cleaned: Record<string, any> = {};
  for (const key in data) {
    const val = data[key];
    if (val !== undefined && val !== null && !Number.isNaN(val)) cleaned[key] = val;
  }
  return cleaned as T;
}

// 🔑 Book ID generator
function createBookId(book: Partial<Book>, type: BookType): string {
  let id = `${book.bookName}-${book.publisher}-${type}`;
  if (type === "Notebook" && book.pages) id += `-${book.pages}`;
  return id.replace(/[^a-zA-Z0-9-]/g, "");
}

const initialFilters: BookFilters = { bookName: "", subject: "", publisher: "" };

export default function CalculatorDashboard() {
  const [textbooks, setTextbooks] = useState<Book[]>([]);
  const [notebooks, setNotebooks] = useState<Book[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [currentUploadId, setCurrentUploadId] = useState<string | null>(null);
  const [className, setClassName] = useState("12");
  const [course, setCourse] = useState("Science");
  const [initialTextbookDiscount, setInitialTextbookDiscount] = useState(10);
  const [initialTextbookTax, setInitialTextbookTax] = useState(5);
  const [initialNotebookDiscount, setInitialNotebookDiscount] = useState(15);
  const [initialNotebookTax, setInitialNotebookTax] = useState(5);
  const [textbookFilters, setTextbookFilters] = useState<BookFilters>(initialFilters);
  const [notebookFilters, setNotebookFilters] = useState<BookFilters>(initialFilters);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { user } = useUser();

  const frequentBookDataQuery = useMemoFirebase(
    () => (user && firestore ? collection(firestore, "users", user.uid, "frequent_book_data") : null),
    [firestore, user]
  );
  const { data: frequentBookData } = useCollection<FrequentBookData>(frequentBookDataQuery);

  const calculateFinalPrice = (book: Omit<Book, "finalPrice" | "id" | "uploadId">): number => {
    const priceAfterDiscount = (book.price || 0) * (1 - (book.discount || 0) / 100);
    return priceAfterDiscount * (1 + (book.tax || 0) / 100);
  };

  const createNewUploadRecord = async () => {
    if (!user || !firestore) return null;
    const uploadData: Upload = {
      userId: user.uid,
      class: className,
      courseCombination: course,
      textbookDiscount: initialTextbookDiscount,
      textbookTax: initialTextbookTax,
      notebookDiscount: initialNotebookDiscount,
      notebookTax: initialNotebookTax,
      uploadTimestamp: serverTimestamp(),
      id: "",
    };
    try {
      const collectionRef = collection(firestore, "users", user.uid, "uploads");
      const docRef = await addDocumentNonBlocking(collectionRef, uploadData);
      if (docRef) {
        setCurrentUploadId(docRef.id);
        return docRef.id;
      }
      return null;
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  const processAndLoadData = async (textbookData: Omit<Book, "uploadId">[], notebookData: Omit<Book, "uploadId">[]) => {
    const uploadId = await createNewUploadRecord();
    if (!uploadId) return;

    const applyDefaults = (books: Omit<Book, "uploadId">[], discount: number, tax: number, type: BookType) =>
      books.map((book) => {
        const newBook = { ...book, discount, tax, uploadId, type };
        return { ...newBook, finalPrice: calculateFinalPrice(newBook) };
      });

    setTextbooks(applyDefaults(textbookData, initialTextbookDiscount, initialTextbookTax, "Textbook"));
    setNotebooks(applyDefaults(notebookData, initialNotebookDiscount, initialNotebookTax, "Notebook"));
    setIsDataLoaded(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const textbookSheet = workbook.Sheets["Textbooks"];
        const notebookSheet = workbook.Sheets["Notebooks"];

        const parseSheet = (sheet: XLSX.WorkSheet): Omit<Book, "uploadId">[] => {
          if (!sheet) return [];
          const json = XLSX.utils.sheet_to_json<any>(sheet);
          return json.map((row, index) => ({
            id: row.id || index + 1,
            bookName: row.bookName || "",
            subject: row.subject || "N/A",
            publisher: row.publisher || "N/A",
            price: Number(row.price) || 0,
            pages: row.pages ? parseInt(row.pages) : undefined,
            discount: 0,
            tax: 0,
            finalPrice: 0,
          }));
        };

        const textbooks = parseSheet(textbookSheet);
        const notebooks = parseSheet(notebookSheet);
        await processAndLoadData(textbooks, notebooks);
      } catch (err: any) {
        toast({ variant: "destructive", title: "Error", description: err.message });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleProcessMockData = () => {
    processAndLoadData(TEXTBOOKS_MOCK, NOTEBOOKS_MOCK);
  };

  const handleSaveAllSettings = async () => {
    if (!user || !firestore || !currentUploadId) {
      toast({ variant: "destructive", title: "Error", description: "No active session." });
      return;
    }

    const batch = writeBatch(firestore);
    const timestamp = serverTimestamp();

    const saveBooks = (books: Book[], type: BookType, subcollection: string) => {
      books.forEach((book) => {
        const bookRef = doc(collection(firestore, "users", user.uid, "uploads", currentUploadId, subcollection));
        const data: DenormalizedBook = cleanFirestoreData({
          ...book,
          id: bookRef.id,
          type,
          uploadId: currentUploadId,
          class: className,
          courseCombination: course,
          uploadTimestamp: timestamp,
        });
        batch.set(bookRef, data);

        // Also update frequent_book_data
        const frequentRef = doc(firestore, "users", user.uid, "frequent_book_data", createBookId(book, type));
        batch.set(
          frequentRef,
          cleanFirestoreData({
            userId: user.uid,
            bookName: book.bookName,
            publisher: book.publisher,
            price: Number(book.price) || 0,
            discount: Number(book.discount) || 0,
            tax: Number(book.tax) || 0,
            class: className,
            courseCombination: course,
            type,
            ...(type === "Notebook" && { pages: book.pages ?? null }),
          }),
          { merge: true }
        );
      });
    };

    saveBooks(textbooks, "Textbook", "textbooks");
    saveBooks(notebooks, "Notebook", "notebooks");

    try {
      await batch.commit();
      toast({ title: "Success", description: "Books saved successfully." });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Error", description: "Failed to save." });
    }
  };

  if (!firestore || !user) {
    return (
      <main className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground text-lg">Connecting to Firebase...</p>
      </main>
    );
  }

  return (
    <main className="container flex-grow py-8">
      {!isDataLoaded ? (
        <div className="mx-auto max-w-2xl">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Setup Calculation</CardTitle>
              <CardDescription>Enter class info or upload Excel.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Class</Label>
                  <Select value={className} onValueChange={setClassName}>
                    <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i + 1} value={`${i + 1}`}>
                          Class {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Course Combination</Label>
                  <Input value={course} onChange={(e) => setCourse(e.target.value)} />
                </div>
              </div>
              <Separator />
              <div>
                <Label>Upload Book List (Excel)</Label>
                <Input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={handleProcessMockData}>
                <FileUp className="mr-2 h-4 w-4" /> Use Mock Data
              </Button>
            </CardFooter>
          </Card>
        </div>
      ) : (
        <div className="space-y-8">
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <GraduationCap className="text-primary h-5 w-5" />
                <span>Class {className} — {course}</span>
              </div>
              <Button onClick={handleSaveAllSettings}><Save className="mr-2 h-4 w-4" /> Save All</Button>
            </CardContent>
          </Card>

          <BookTable title="Textbooks" description="List of textbooks." books={textbooks} onBookUpdate={() => {}} onApplyAll={() => {}} filters={textbookFilters} onFilterChange={setTextbookFilters} />

          <Separator />

          <BookTable title="Notebooks" description="List of notebooks." books={notebooks} onBookUpdate={() => {}} onApplyAll={() => {}} isNotebookTable filters={notebookFilters} onFilterChange={setNotebookFilters} />
        </div>
      )}
    </main>
  );
}
