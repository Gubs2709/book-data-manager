"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFirebase, useUser } from "@/firebase";
import {
  collectionGroup,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import * as XLSX from "xlsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Database,
  RefreshCw,
  Trash2,
  Download,
  BarChart2,
  Table as TableIcon,
} from "lucide-react";
import { toast } from "sonner";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface BookData {
  id: string;
  path: string;
  type: string;
  class: string;
  courseCombination: string;
  bookName: string;
  publisher: string;
  pages?: number;
  price: number;
  discount: number;
  tax: number;
  finalPrice?: number;
}

const COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#d84a4a",
  "#4ab3d8",
  "#a64ad8",
  "#f97316",
];

export default function DataExplorer() {
  const { firestore } = useFirebase();
  const { user } = useUser();

  const [books, setBooks] = useState<BookData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");

  const [filterClasses, setFilterClasses] = useState<string[]>([]);
  const [filterCourses, setFilterCourses] = useState<string[]>([]);
  const [filterPublishers, setFilterPublishers] = useState<string[]>([]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(value || 0);

  const fetchAllBooks = async () => {
    if (!firestore) return;
    setIsLoading(true);
    try {
      const [textbooksSnap, notebooksSnap] = await Promise.all([
        getDocs(collectionGroup(firestore, "textbooks")),
        getDocs(collectionGroup(firestore, "notebooks")),
      ]);
      const textbooks = textbooksSnap.docs.map((d) => ({
        id: d.id,
        path: d.ref.path,
        ...(d.data() as any),
        type: "Textbook",
      }));
      const notebooks = notebooksSnap.docs.map((d) => ({
        id: d.id,
        path: d.ref.path,
        ...(d.data() as any),
        type: "Notebook",
      }));
      setBooks([...textbooks, ...notebooks]);
      toast.success("Data loaded successfully!");
    } catch {
      toast.error("Error fetching data");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      const matchClass =
        filterClasses.length === 0 || filterClasses.includes(b.class);
      const matchCourse =
        filterCourses.length === 0 ||
        filterCourses.includes(b.courseCombination);
      const matchPublisher =
        filterPublishers.length === 0 || filterPublishers.includes(b.publisher);
      return matchClass && matchCourse && matchPublisher;
    });
  }, [books, filterClasses, filterCourses, filterPublishers]);

  const summary = useMemo(() => {
    const totalBooks = filteredBooks.length;
    const totalValue = filteredBooks.reduce(
      (sum, b) => sum + (b.finalPrice || 0),
      0
    );
    const avgDiscount =
      filteredBooks.reduce((sum, b) => sum + (b.discount || 0), 0) /
      (totalBooks || 1);
    const avgTax =
      filteredBooks.reduce((sum, b) => sum + (b.tax || 0), 0) /
      (totalBooks || 1);
    return { totalBooks, totalValue, avgDiscount, avgTax };
  }, [filteredBooks]);

  const classOptions = Array.from(new Set(books.map((b) => b.class)))
    .filter(Boolean)
    .sort()
    .map((cls) => ({ label: cls, value: cls }));

  const courseOptions = Array.from(
    new Set(books.map((b) => b.courseCombination))
  )
    .filter(Boolean)
    .sort()
    .map((course) => ({ label: course, value: course }));

  const publisherOptions = Array.from(
    new Set(books.map((b) => b.publisher))
  )
    .filter(Boolean)
    .sort()
    .map((pub) => ({ label: pub, value: pub }));

  const handleDeleteAll = async () => {
    if (!confirm("⚠️ Are you sure you want to delete ALL data?")) return;
    try {
      await Promise.all(books.map((b) => deleteDoc(doc(firestore, b.path))));
      setBooks([]);
      toast.success("All data deleted successfully!");
    } catch {
      toast.error("Error deleting data");
    }
  };

  const handleDownload = (filteredOnly: boolean = false) => {
    const data = filteredOnly ? filteredBooks : books;
    if (data.length === 0) return toast.warning("No data to download!");

    const ws = XLSX.utils.json_to_sheet(
      data.map((b) => ({
        Class: b.class,
        Course: b.courseCombination,
        "Book Name": b.bookName,
        Type: b.type,
        Publisher: b.publisher,
        Price: b.price,
        Discount: b.discount,
        Tax: b.tax,
        "Final Price": b.finalPrice,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Books");
    XLSX.writeFile(wb, filteredOnly ? "Filtered_Books.xlsx" : "All_Books.xlsx");
    toast.success(`Downloaded ${filteredOnly ? "filtered" : "all"} data`);
  };

  useEffect(() => {
    fetchAllBooks();
  }, [firestore, user]);

  return (
    <main className="container py-8 space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Database className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Book Data Manager</h1>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button variant="destructive" onClick={handleDeleteAll}>
            <Trash2 className="h-4 w-4 mr-2" /> Delete All
          </Button>
          <Button onClick={() => handleDownload(false)}>
            <Download className="h-4 w-4 mr-2" /> Download All
          </Button>
          <Button variant="secondary" onClick={() => handleDownload(true)}>
            <Download className="h-4 w-4 mr-2" /> Download Filtered
          </Button>
          <Button variant="outline" onClick={fetchAllBooks}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              setViewMode((v) => (v === "chart" ? "table" : "chart"))
            }
          >
            {viewMode === "chart" ? (
              <>
                <TableIcon className="h-4 w-4 mr-2" /> Table View
              </>
            ) : (
              <>
                <BarChart2 className="h-4 w-4 mr-2" /> Chart View
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><h3>Total Books</h3><p className="text-2xl font-bold">{summary.totalBooks}</p></CardContent></Card>
        <Card><CardContent className="p-4"><h3>Total Value</h3><p className="text-2xl font-bold">{formatCurrency(summary.totalValue)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><h3>Avg Discount</h3><p className="text-2xl font-bold">{summary.avgDiscount.toFixed(1)}%</p></CardContent></Card>
        <Card><CardContent className="p-4"><h3>Avg Tax</h3><p className="text-2xl font-bold">{summary.avgTax.toFixed(1)}%</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MultiSelect options={classOptions} placeholder="Filter by Class" onValueChange={setFilterClasses} />
        <MultiSelect options={courseOptions} placeholder="Filter by Course" onValueChange={setFilterCourses} />
        <MultiSelect options={publisherOptions} placeholder="Filter by Publisher" onValueChange={setFilterPublishers} />
      </div>

      <AnimatePresence mode="wait">
        {viewMode === "chart" ? (
          <motion.div key="chart" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle>Cost by Class</CardTitle></CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredBooks.map((b) => ({ name: b.class, value: b.finalPrice }))}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Cost by Publisher</CardTitle></CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={filteredBooks.map((b) => ({ name: b.publisher, value: b.finalPrice }))} dataKey="value" nameKey="name" outerRadius={100} label>
                        {filteredBooks.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                      </Pie>
                      <Legend />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        ) : (
          <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card>
              <CardHeader><CardTitle>Filtered Books Table</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Loader2 className="animate-spin inline-block" /> Loading...
                  </div>
                ) : filteredBooks.length === 0 ? (
                  <p className="text-center text-muted-foreground">No data found</p>
                ) : (
                  <div className="overflow-x-auto border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Class</TableHead>
                          <TableHead>Course</TableHead>
                          <TableHead>Book Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Publisher</TableHead>
                          <TableHead>Final Price</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBooks.map((b) => (
                          <TableRow key={b.id}>
                            <TableCell>{b.class}</TableCell>
                            <TableCell>{b.courseCombination}</TableCell>
                            <TableCell>{b.bookName}</TableCell>
                            <TableCell>{b.type}</TableCell>
                            <TableCell>{b.publisher}</TableCell>
                            <TableCell>{formatCurrency(b.finalPrice || 0)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
