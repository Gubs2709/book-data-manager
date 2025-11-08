"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, writeBatch } from "firebase/firestore";
import { useFirebase, useUser } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DataExplorer() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !firestore) {
        // If there's no user, we shouldn't be in a loading state.
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const frequentBookDataRef = collection(firestore, "users", user.uid, "frequent_book_data");
        const snapshot = await getDocs(frequentBookDataRef);
        const docs = snapshot.docs.map((doc) => doc.data());
        setData(docs);
      } catch (err) {
        console.error("Error fetching data:", err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not fetch saved book data.",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [firestore, user, toast]);

  const handleDeleteAll = async () => {
    if (!user || !firestore) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to perform this action.",
      });
      return;
    }

    const frequentBookDataRef = collection(firestore, "users", user.uid, "frequent_book_data");

    try {
      const snapshot = await getDocs(frequentBookDataRef);
      if (snapshot.empty) {
        toast({
          title: "No Data",
          description: "There is nothing to delete.",
        });
        return;
      }

      const batch = writeBatch(firestore);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      setData([]); // Clear data in the UI
      toast({
        title: "Success",
        description: "All saved book data has been deleted.",
      });
    } catch (error) {
      console.error("Error deleting all documents: ", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete all data. Please try again.",
      });
    }
  };


  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(v || 0);

  if (loading) {
    return <p className="text-center py-8 text-muted-foreground">Loading data...</p>;
  }

  if (!user && !loading) {
    return (
      <main className="container flex items-center justify-center py-8" style={{ minHeight: 'calc(100vh - 10rem)'}}>
        <p className="text-muted-foreground text-lg">Please sign in to view your saved data.</p>
      </main>
    );
  }

  return (
    <main className="container py-8">
      <Card className="shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Your Saved Books</CardTitle>
           <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={data.length === 0}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete all
                  your saved book data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAll}>
                  Continue
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardHeader>
        <CardContent>
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
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">Tax</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length > 0 ? (
                data.map((book, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{book.class || "N/A"}</TableCell>
                    <TableCell>{book.courseCombination || "N/A"}</TableCell>
                    <TableCell>{book.bookName || "Untitled"}</TableCell>
                    <TableCell>{book.type || "N/A"}</TableCell>
                    <TableCell>{book.publisher || "N/A"}</TableCell>
                    <TableCell>{book.pages ?? "N/A"}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(book.price) || 0)}</TableCell>
                    <TableCell className="text-right">{Number(book.discount) || 0}%</TableCell>
                    <TableCell className="text-right">{Number(book.tax) || 0}%</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-4">
                    No data found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
