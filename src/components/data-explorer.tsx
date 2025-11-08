'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { collection, getDocs, DocumentData } from 'firebase/firestore';
import type { BookType, DenormalizedBook } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

export default function DataExplorer() {
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();

  const [classFilter, setClassFilter] = useState<string>('all');
  const [publisherFilter, setPublisherFilter] = useState<string>('all');
  const [bookTypeFilter, setBookTypeFilter] = useState<BookType | 'all'>('all');
  const [allBooks, setAllBooks] = useState<DenormalizedBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAllBooks() {
      // Ensure a user is signed in before fetching
      if (!user || user.isAnonymous || !firestore) {
        setIsLoading(false);
        setAllBooks([]);
        return;
      }

      setIsLoading(true);
      try {
        const books: DenormalizedBook[] = [];

        // ✅ Fetch from user’s subcollections (matches your Firestore)
        const uploadsRef = collection(firestore, "users", user.uid, "uploads");
        const frequentRef = collection(firestore, "users", user.uid, "frequent_book_data");

        // Fetch both collections safely
        const [uploadsSnap, frequentSnap] = await Promise.all([
          getDocs(uploadsRef).catch(err => {
            errorEmitter.emit("permission-error", new FirestorePermissionError({
              path: "uploads", operation: "list"
            }));
            return { docs: [] };
          }),
          getDocs(frequentRef).catch(err => {
            errorEmitter.emit("permission-error", new FirestorePermissionError({
              path: "frequent_book_data", operation: "list"
            }));
            return { docs: [] };
          }),
        ]);

        // Add uploads data (you can tag them as Textbooks)
        uploadsSnap.docs.forEach(doc => {
          const bookData = doc.data() as Omit<DenormalizedBook, 'type'>;
          books.push({
            ...bookData,
            id: doc.id,
            type: 'Textbook',
            userId: user.uid,
          });
        });

        // Add frequent book data (you can tag them as Notebooks)
        frequentSnap.docs.forEach(doc => {
          const bookData = doc.data() as Omit<DenormalizedBook, 'type'>;
          books.push({
            ...bookData,
            id: doc.id,
            type: 'Notebook',
            userId: user.uid,
          });
        });

        setAllBooks(books);
      } catch (error) {
        console.error("Error fetching Firestore data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (!isUserLoading) {
      fetchAllBooks();
    }
  }, [user, isUserLoading, firestore]);

  // Filtering logic
  const filteredBooks = useMemo(() => {
    return allBooks
      .filter(book => (classFilter === 'all' ? true : book.class === classFilter))
      .filter(book => (publisherFilter === 'all' ? true : book.publisher === publisherFilter))
      .filter(book => (bookTypeFilter === 'all' ? true : book.type === bookTypeFilter));
  }, [allBooks, classFilter, publisherFilter, bookTypeFilter]);

  const allPublishers = useMemo(() => {
    if (!allBooks) return [];
    const publishers = allBooks.map(b => b.publisher);
    return [...new Set(publishers)].filter(Boolean).sort();
  }, [allBooks]);

  const allClasses = useMemo(() => {
    if (!allBooks) return [];
    const classes = allBooks.map(u => u.class);
    return [...new Set(classes)].filter(Boolean).sort((a, b) => parseInt(a) - parseInt(b));
  }, [allBooks]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(value);
  };

  const showLoadingState = isLoading || isUserLoading;

  return (
    <main className="container flex-grow py-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-tight text-primary">
            Data Explorer
          </CardTitle>
          <CardDescription>
            View and filter all your saved book data from previous uploads.
          </CardDescription>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Select onValueChange={setClassFilter} defaultValue="all">
              <SelectTrigger>
                <SelectValue placeholder="Filter by Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {allClasses.map(c => (
                  <SelectItem key={c} value={c}>
                    Class {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select onValueChange={setPublisherFilter} defaultValue="all">
              <SelectTrigger>
                <SelectValue placeholder="Filter by Publisher" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Publishers</SelectItem>
                {allPublishers.map(p => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              onValueChange={value => setBookTypeFilter(value as BookType | 'all')}
              defaultValue="all"
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Textbook">Textbooks</SelectItem>
                <SelectItem value="Notebook">Notebooks</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          <div className="relative overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Book Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Publisher</TableHead>
                  <TableHead>Pages</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Discount (%)</TableHead>
                  <TableHead className="text-right">Tax (%)</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {showLoadingState ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={9} className="h-12 text-center">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ))
                ) : !user || user.isAnonymous ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      Please sign in to view your data.
                    </TableCell>
                  </TableRow>
                ) : filteredBooks.length > 0 ? (
                  filteredBooks.map(book => (
                    <TableRow key={book.id}>
                      <TableCell>{book.class}</TableCell>
                      <TableCell>{book.courseCombination}</TableCell>
                      <TableCell className="font-medium">{book.bookName}</TableCell>
                      <TableCell>
                        <Badge variant={book.type === 'Textbook' ? 'default' : 'secondary'}>
                          {book.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{book.publisher}</TableCell>
                      <TableCell>{book.pages ?? 'N/A'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(book.price)}</TableCell>
                      <TableCell className="text-right">{book.discount}%</TableCell>
                      <TableCell className="text-right">{book.tax}%</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      No data found. Start by using the Price Calculator.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
