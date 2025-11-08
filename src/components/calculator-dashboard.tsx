"use client";

import { useState, useMemo } from "react";
import type { Book } from "@/lib/types";
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
import { Calculator, Download, FileUp, Undo2 } from "lucide-react";
import { Separator } from "./ui/separator";

export default function CalculatorDashboard() {
  const [textbooks, setTextbooks] = useState<Book[]>([]);
  const [notebooks, setNotebooks] = useState<Book[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Form state
  const [className, setClassName] = useState("12");
  const [course, setCourse] = useState("Science");
  const [initialTextbookDiscount, setInitialTextbookDiscount] = useState(10);
  const [initialTextbookTax, setInitialTextbookTax] = useState(5);
  const [initialNotebookDiscount, setInitialNotebookDiscount] = useState(15);
  const [initialNotebookTax, setInitialNotebookTax] = useState(5);

  const calculateFinalPrice = (book: Omit<Book, 'finalPrice'>): number => {
    const priceAfterDiscount = book.price * (1 - book.discount / 100);
    const finalPrice = priceAfterDiscount * (1 + book.tax / 100);
    return finalPrice;
  };

  const totals = useMemo(() => {
    const textbookTotal = textbooks.reduce((sum, book) => sum + book.finalPrice, 0);
    const notebookTotal = notebooks.reduce((sum, book) => sum + book.finalPrice, 0);
    const grandTotal = textbookTotal + notebookTotal;
    return { textbookTotal, notebookTotal, grandTotal };
  }, [textbooks, notebooks]);

  const handleProcessUpload = () => {
    const applyInitialValues = (mockData: Book[], discount: number, tax: number) =>
      mockData.map((book) => {
        const newBook = { ...book, discount, tax };
        return { ...newBook, finalPrice: calculateFinalPrice(newBook) };
      });

    setTextbooks(applyInitialValues(TEXTBOOKS_MOCK, initialTextbookDiscount, initialTextbookTax));
    setNotebooks(applyInitialValues(NOTEBOOKS_MOCK, initialNotebookDiscount, initialNotebookTax));
    setIsDataLoaded(true);
  };
  
  const handleReset = () => {
    setIsDataLoaded(false);
    setTextbooks([]);
    setNotebooks([]);
  }
  
  const handleUpdateBook = (table: 'textbooks' | 'notebooks', bookId: number, field: keyof Omit<Book, 'id' | 'subject' | 'price' | 'finalPrice'>, value: string | number) => {
    const updater = table === 'textbooks' ? setTextbooks : setNotebooks;
    updater(prevBooks =>
      prevBooks.map(book => {
        if (book.id === bookId) {
          const updatedBook = { ...book, [field]: value };
          if (field !== 'bookName') {
            return { ...updatedBook, finalPrice: calculateFinalPrice(updatedBook) };
          }
          return updatedBook;
        }
        return book;
      })
    );
  };

  const handleApplyAll = (table: 'textbooks' | 'notebooks', field: 'discount' | 'tax', value: number) => {
    const updater = table === 'textbooks' ? setTextbooks : setNotebooks;
    updater(prevBooks =>
      prevBooks.map(book => {
        const updatedBook = { ...book, [field]: value };
        return { ...updatedBook, finalPrice: calculateFinalPrice(updatedBook) };
      })
    );
  };

  const handleDownload = () => {
    alert("Download functionality is mocked. In a real app, this would generate and download an Excel file. Check the browser console for the data that would be exported.");
    const fileName = `${className}_${course}_EduBook_Calculated.xlsx`;
    console.log(`Preparing to download: ${fileName}`);
    console.log({
        className,
        course,
        textbooks,
        notebooks,
        totals,
    });
  }
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(value);
  };

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
                  This simulates uploading and processing an Excel file.
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
              </CardContent>
              <CardFooter>
                <Button size="lg" className="w-full font-bold" onClick={handleProcessUpload}>
                  <FileUp className="mr-2 h-4 w-4" /> Mock Upload & Process
                </Button>
              </CardFooter>
            </Card>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in-50 duration-500">
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
