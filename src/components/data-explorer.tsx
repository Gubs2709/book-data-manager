
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirebase, useUser, useMemoFirebase } from '@/firebase';
import { collection, getDocs, query, collectionGroup, where, Query } from 'firebase/firestore';
import type { Upload, Book, BookType } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

type EnrichedBook = Book & {
    uploadId: string;
    class: string;
    courseCombination: string;
    uploadTimestamp: Date;
    type: BookType;
};

export default function DataExplorer() {
  const { firestore } = useFirebase();
  const { user } = useUser();

  const [classFilter, setClassFilter] = useState<string>('all');
  const [publisherFilter, setPublisherFilter] = useState<string>('');
  const [bookTypeFilter, setBookTypeFilter] = useState<BookType | 'all'>('all');
  const [allBooks, setAllBooks] = useState<EnrichedBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const uploadsQuery = useMemoFirebase(
    () => (user && firestore ? collection(firestore, 'users', user.uid, 'uploads') : null),
    [firestore, user]
  );
  
  useEffect(() => {
    async function fetchAllBooks() {
        if (!user || !firestore || !uploadsQuery) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const enrichedBooks: EnrichedBook[] = [];

        try {
            const uploadSnapshots = await getDocs(uploadsQuery);
            const uploads = uploadSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as Upload));

            for (const upload of uploads) {
                const textbooksRef = collection(firestore, 'users', user.uid, 'uploads', upload.id, 'textbooks');
                const notebooksRef = collection(firestore, 'users', user.uid, 'uploads', upload.id, 'notebooks');

                const textbookSnap = await getDocs(textbooksRef);
                textbookSnap.forEach(doc => {
                    const bookData = doc.data() as Book;
                    enrichedBooks.push({
                        ...bookData,
                        id: doc.id,
                        uploadId: upload.id,
                        class: upload.class,
                        courseCombination: upload.courseCombination,
                        uploadTimestamp: upload.uploadTimestamp.toDate(),
                        type: 'Textbook'
                    });
                });
                
                const notebookSnap = await getDocs(notebooksRef);
                notebookSnap.forEach(doc => {
                    const bookData = doc.data() as Book;
                    enrichedBooks.push({
                        ...bookData,
                        id: doc.id,
                        uploadId: upload.id,
                        class: upload.class,
                        courseCombination: upload.courseCombination,
                        uploadTimestamp: upload.uploadTimestamp.toDate(),
                        type: 'Notebook'
                    });
                });
            }
            setAllBooks(enrichedBooks);
        } catch (error) {
            console.error("Error fetching all book data:", error);
        } finally {
            setIsLoading(false);
        }
    }

    fetchAllBooks();
  }, [user, firestore, uploadsQuery]);


  const filteredBooks = useMemo(() => {
    return allBooks
      .filter(book => {
        if (classFilter === 'all') return true;
        return book.class === classFilter;
      })
      .filter(book => {
        if (!publisherFilter) return true;
        return book.publisher.toLowerCase().includes(publisherFilter.toLowerCase());
      })
      .filter(book => {
          if (bookTypeFilter === 'all') return true;
          return book.type === bookTypeFilter;
      });
  }, [allBooks, classFilter, publisherFilter, bookTypeFilter]);

  const allPublishers = useMemo(() => {
    if (!allBooks) return [];
    const publishers = allBooks.map(b => b.publisher);
    return [...new Set(publishers)].filter(Boolean).sort();
  }, [allBooks]);

  const allClasses = useMemo(() => {
    if (!allBooks) return [];
    const classes = allBooks.map(u => u.class);
    return [...new Set(classes)].filter(Boolean).sort((a,b) => parseInt(a) - parseInt(b));
  }, [allBooks]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(value);
  };
  
  return (
    <main className="container flex-grow py-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-tight text-primary">Data Explorer</CardTitle>
          <CardDescription>View and filter all your saved book data from previous uploads.</CardDescription>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Select onValueChange={setClassFilter} defaultValue="all">
              <SelectTrigger>
                <SelectValue placeholder="Filter by Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {allClasses.map(c => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input 
                placeholder="Filter by Publisher..."
                value={publisherFilter}
                onChange={e => setPublisherFilter(e.target.value)}
            />
            <Select onValueChange={(value) => setBookTypeFilter(value as BookType | 'all')} defaultValue="all">
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
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={9} className="h-12 text-center">Loading...</TableCell>
                    </TableRow>
                  ))
                ) : filteredBooks.length > 0 ? (
                  filteredBooks.map((book) => (
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
