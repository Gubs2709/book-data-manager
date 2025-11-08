
"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Book } from "@/lib/types";

interface BookTableProps {
  title: string;
  description: string;
  books: Book[];
  onBookUpdate: (bookId: number, field: keyof Omit<Book, 'id' | 'finalPrice'>, value: string | number) => void;
  onApplyAll: (field: "discount" | "tax", value: number) => void;
}

export function BookTable({
  title,
  description,
  books,
  onBookUpdate,
  onApplyAll,
}: BookTableProps) {
  const [allDiscount, setAllDiscount] = useState(0);
  const [allTax, setAllTax] = useState(0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(value);
  };

  return (
    <Card className="flex h-full flex-col shadow-lg">
      <CardHeader>
        <CardTitle className="text-primary">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <div className="mt-4 flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-2">
            <Input
              type="number"
              placeholder="Discount %"
              className="max-w-[120px]"
              value={allDiscount}
              onChange={(e) => setAllDiscount(parseFloat(e.target.value) || 0)}
              aria-label={`Global Discount for ${title}`}
            />
            <Button size="sm" onClick={() => onApplyAll("discount", allDiscount)}>
              Apply to All
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <Input
              type="number"
              placeholder="Tax %"
              className="max-w-[120px]"
              value={allTax}
              onChange={(e) => setAllTax(parseFloat(e.target.value) || 0)}
              aria-label={`Global Tax for ${title}`}
            />
            <Button size="sm" onClick={() => onApplyAll("tax", allTax)}>
              Apply to All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="relative overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[250px] font-semibold">Book Name</TableHead>
                <TableHead className="min-w-[150px] font-semibold">Subject</TableHead>
                <TableHead className="min-w-[150px] font-semibold">Publisher</TableHead>
                <TableHead className="min-w-[120px] text-right font-semibold">Price</TableHead>
                <TableHead className="w-[120px] text-right font-semibold">Discount (%)</TableHead>
                <TableHead className="w-[120px] text-right font-semibold">Tax (%)</TableHead>
                <TableHead className="text-right font-semibold">Final Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {books.map((book) => (
                <TableRow key={book.id}>
                  <TableCell>
                    <Input
                      value={book.bookName}
                      onChange={(e) =>
                        onBookUpdate(book.id, "bookName", e.target.value)
                      }
                      className="font-medium"
                      aria-label={`Book name for ${book.bookName}`}
                    />
                  </TableCell>
                  <TableCell>
                     <Input
                      value={book.subject}
                      onChange={(e) =>
                        onBookUpdate(book.id, "subject", e.target.value)
                      }
                      aria-label={`Subject for ${book.bookName}`}
                    />
                  </TableCell>
                   <TableCell>
                     <Input
                      value={book.publisher}
                      onChange={(e) =>
                        onBookUpdate(book.id, "publisher", e.target.value)
                      }
                      aria-label={`Publisher for ${book.bookName}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={book.price}
                      onChange={(e) =>
                        onBookUpdate(book.id, "price", parseFloat(e.target.value) || 0)
                      }
                      className="text-right"
                      aria-label={`Price for ${book.bookName}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={book.discount}
                      onChange={(e) =>
                        onBookUpdate(book.id, "discount", parseFloat(e.target.value) || 0)
                      }
                      className="text-right"
                      aria-label={`Discount for ${book.bookName}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={book.tax}
                      onChange={(e) =>
                        onBookUpdate(book.id, "tax", parseFloat(e.target.value) || 0)
                      }
                      className="text-right"
                      aria-label={`Tax for ${book.bookName}`}
                    />
                  </TableCell>
                  <TableCell className="text-right font-semibold text-primary">
                    {formatCurrency(book.finalPrice)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
