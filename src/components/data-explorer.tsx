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

// 🧩 Utility to sanitize numbers safely
const safeNumber = (val: any): number => {
  const num = Number(val);
  return isFinite(num) ? num : 0;
};

// ✅ Chart data sanitizer to ensure no invalid values are passed to Recharts
function sanitizeChartData(data: Record<string, any>[]): Record<string, any>[] {
  return data
    .map((item) => ({
      name: item.name?.toString() || "Unknown",
      value: safeNumber(item.value),
    }))
    .filter((item) => typeof item.value === "number" && isFinite(item.value));
}

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
    }).format(safeNumber(value));

  // 🔄 Fetch all books (textbooks + notebooks)
  async function fetchAllBooks() {
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
        finalPrice: safeNumber((d.data() as any).finalPrice),
        price: safeNumber((d.data() as any).price),
      }));

      const notebooks = notebooksSnap.docs.map((d) => ({
        id: d.id,
        path: d.ref.path,
        ...(d.data() as any),
        type: "Notebook",
        finalPrice: safeNumber((d.data() as any).finalPrice),
        price: safeNumber((d.data() as any).price),
      }));

      setBooks([...textbooks, ...notebooks]);
      toast.success("Data loaded successfully!");
    } catch {
      toast.error("Error fetching data");
    } finally {
      setIsLoading(false);
    }
  }

  // 🔍 Apply filters
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

  // 📊 Summary
  const summary = useMemo(() => {
    const totalBooks = filteredBooks.length;
    const totalValue = filteredBooks.reduce(
      (sum, b) => sum + safeNumber(b.finalPrice),
      0
    );
    const avgDiscount = totalBooks > 0 ? filteredBooks.reduce((sum, b) => sum + safeNumber(b.discount), 0) / totalBooks : 0;
    const avgTax = totalBooks > 0 ? filteredBooks.reduce((sum, b) => sum + safeNumber(b.tax), 0) / totalBooks : 0;

    return { totalBooks, totalValue, avgDiscount, avgTax };
  }, [filteredBooks]);

  // 🧮 Chart data (safe aggregation)
  const classChartData = useMemo(() => {
    const grouped: Record<string, number> = {};
    filteredBooks.forEach((b) => {
      const key = b.class || "Unknown";
      grouped[key] = (grouped[key] || 0) + safeNumber(b.finalPrice);
    });
    return sanitizeChartData(
      Object.entries(grouped).map(([name, value]) => ({ name, value }))
    );
  }, [filteredBooks]);

  const publisherChartData = useMemo(() => {
    const grouped: Record<string, number> = {};
    filteredBooks.forEach((b) => {
      const key = b.publisher || "Unknown";
      grouped[key] = (grouped[key] || 0) + safeNumber(b.finalPrice);
    });
    return sanitizeChartData(
      Object.entries(grouped).map(([name, value]) => ({ name, value }))
    );
  }, [filteredBooks]);

  // 🎚 Filter options
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

  // 🗑 Delete all entries
  async function handleDeleteAll() {
    if (!firestore) {
      toast.error("Firestore not initialized.");
      return;
    }
    if (!confirm("⚠️ Are you sure you want to delete ALL data?")) return;
    try {
      await Promise.all(books.map((b) => deleteDoc(doc(firestore, b.path))));
      setBooks([]);
      toast.success("All data deleted successfully!");
    } catch {
      toast.error("Error deleting data");
    }
  }

  // 📥 Download
  const handleDownload = (filteredOnly = false) => {
    const data = filteredOnly ? filteredBooks : books;
    if (data.length === 0) return toast.warning("No data to download!");

    const ws = XLSX.utils.json_to_sheet(
      data.map((b) => ({
        Class: b.class,
        Course: b.courseCombination,
        "Book Name": b.bookName,
        Type: b.type,
        Publisher: b.publisher,
        Price: safeNumber(b.price),
        Discount: safeNumber(b.discount),
        Tax: safeNumber(b.tax),
        "Final Price": safeNumber(b.finalPrice),
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Books");
    XLSX.writeFile(wb, filteredOnly ? "Filtered_Books.xlsx" : "All_Books.xlsx");
    toast.success(`Downloaded ${filteredOnly ? "filtered" : "all"} data`);
  };

  useEffect(() => {
    if (user) {
      fetchAllBooks();
    }
  }, [firestore, user]);

  return (
    <main className="container py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Database className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Book Data Manager</h1>
        </div>
        <div className="flex flex-wrap gap-3">
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card><CardContent className="p-4"><h3>Total Books</h3><p className="text-3xl font-bold">{summary.totalBooks}</p></CardContent></Card>
        <Card><CardContent className="p-4"><h3>Total Value</h3><p className="text-3xl font-bold">{formatCurrency(summary.totalValue)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><h3>Avg Discount</h3><p className="text-3xl font-bold">{summary.avgDiscount.toFixed(1)}%</p></CardContent></Card>
        <Card><CardContent className="p-4"><h3>Avg Tax</h3><p className="text-3xl font-bold">{summary.avgTax.toFixed(1)}%</p></CardContent></Card>
      </div>

      {/* Filters */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-muted-foreground">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MultiSelect options={classOptions} placeholder="Filter by Class" onValueChange={setFilterClasses} />
          <MultiSelect options={courseOptions} placeholder="Filter by Course" onValueChange={setFilterCourses} />
          <MultiSelect options={publisherOptions} placeholder="Filter by Publisher" onValueChange={setFilterPublishers} />
        </div>
      </section>

      {/* Charts or Table */}
      <AnimatePresence mode="wait">
        {viewMode === "chart" ? (
          <motion.div
            key="chart"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Cost by Class */}
              <Card>
                <CardHeader><CardTitle>Cost by Class</CardTitle></CardHeader>
                <CardContent className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={classChartData}
                    >
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Cost by Publisher */}
              <Card>
                <CardHeader><CardTitle>Cost by Publisher</CardTitle></CardHeader>
                <CardContent className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={publisherChartData}
                    >
                      <XAxis
                        dataKey="name"
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="table"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
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
                          <TableRow key={b.path}>
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
