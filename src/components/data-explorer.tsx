
'use client';

import { useState, useMemo } from 'react';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, collectionGroup } from 'firebase/firestore';
import type { Upload, FrequentBookData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

type EnrichedBookData = FrequentBookData & {
    uploadClass?: string;
    uploadCourse?: string;
    uploadTimestamp?: Date;
  };

export default function DataExplorer() {
  const { firestore } = useFirebase();
  const { user } = useUser();

  const [classFilter, setClassFilter] = useState<string>('all');
  const [publisherFilter, setPublisherFilter] = useState<string>('');

  const uploadsQuery = useMemoFirebase(
    () => (user && firestore ? collection(firestore, 'users', user.uid, 'uploads') : null),
    [firestore, user]
  );
  const { data: uploads, isLoading: uploadsLoading } = useCollection<Upload>(uploadsQuery);

  const allBooksQuery = useMemoFirebase(
    () => (user && firestore ? query(collectionGroup(firestore, 'frequent_book_data')) : null),
    [firestore, user]
  );
  const { data: allBooks, isLoading: booksLoading } = useCollection<FrequentBookData>(allBooksQuery);
  

  const enrichedBooks = useMemo(() => {
    if (!allBooks || !uploads) return [];
  
    const userUploads = uploads.filter(u => u.userId === user?.uid);
    const userBooks = allBooks.filter(b => b.userId === user?.uid);
  
    const uploadMap = new Map(userUploads.map(u => [u.id, u]));
  
    // This part is tricky because frequent_book_data isn't directly linked to an upload.
    // For this example, we'll just display the frequent book data as is.
    // A more complex schema would be needed to link them properly.
    
    return userBooks;

  }, [allBooks, uploads, user?.uid]);

  const filteredBooks = useMemo(() => {
    return enrichedBooks
      .filter(book => {
        // Since we don't have a class on the book directly, we can't filter by it.
        // This is a limitation of the current schema.
        // For now, class filter will not work as intended.
        return true;
      })
      .filter(book => {
        if (!publisherFilter) return true;
        return book.publisher.toLowerCase().includes(publisherFilter.toLowerCase());
      });
  }, [enrichedBooks, classFilter, publisherFilter]);

  const allPublishers = useMemo(() => {
    if (!allBooks) return [];
    const publishers = allBooks.map(b => b.publisher);
    return [...new Set(publishers)].filter(Boolean).sort();
  }, [allBooks]);

  const allClasses = useMemo(() => {
    if (!uploads) return [];
    const classes = uploads.map(u => u.class);
    return [...new Set(classes)].filter(Boolean).sort((a,b) => parseInt(a) - parseInt(b));
  }, [uploads]);

  const isLoading = uploadsLoading || booksLoading;

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
          <CardDescription>View and filter all your saved book data.</CardDescription>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Select onValueChange={setClassFilter} defaultValue="all" disabled>
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
          </div>
           <p className="text-xs text-muted-foreground mt-2">
            Note: Class filtering is disabled due to the current data structure. All saved frequent book data is displayed.
           </p>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
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
                      <TableCell colSpan={7} className="h-12 text-center">Loading...</TableCell>
                    </TableRow>
                  ))
                ) : filteredBooks.length > 0 ? (
                  filteredBooks.map((book) => (
                    <TableRow key={book.id}>
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
                    <TableCell colSpan={7} className="h-24 text-center">
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
