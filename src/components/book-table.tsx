"use client";

import { useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Book, BookFilters } from "@/lib/types";

interface BookTableProps {
  title: string;
  description: string;
  books: Book[];
  onBookUpdate: (bookId: number | string, field: keyof Omit<Book, 'id' | 'finalPrice' | 'uploadId'>, value: string | number) => void;
  onApplyAll: (field: "discount" | "tax", value: number) => void;
  isNotebookTable?: boolean;
  filters: BookFilters;
  onFilterChange: (setter: React.Dispatch<React.SetStateAction<BookFilters>>) => void;
}

export function BookTable({
  title, description, books, onBookUpdate, onApplyAll,
  isNotebookTable = false, filters, onFilterChange,
}: BookTableProps) {
  const [allDiscount, setAllDiscount] = useState(0);
  const [allTax, setAllTax] = useState(0);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);

  const handleFilter = (column: keyof BookFilters, value: string) => {
    onFilterChange((prev) => ({ ...prev, [column]: value }));
  };

  return (
    <Card className="flex h-full flex-col shadow-lg">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-primary">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>

        <div className="mt-4 flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-2">
            <Input
              type="number"
              placeholder="Discount %"
              className="max-w-[120px]"
              value={allDiscount}
              onChange={(e) => setAllDiscount(parseFloat(e.target.value) || 0)}
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
                <TableHead>Book Name</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Publisher</TableHead>
                {isNotebookTable && <TableHead>Pages</TableHead>}
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Discount (%)</TableHead>
                <TableHead className="text-right">Tax (%)</TableHead>
                <TableHead className="text-right">Final Price</TableHead>
              </TableRow>
              <TableRow>
                <TableHead>
                  <Input placeholder="Filter by name..." value={filters.bookName}
                    onChange={(e) => handleFilter('bookName', e.target.value)} />
                </TableHead>
                <TableHead>
                  <Input placeholder="Filter by subject..." value={filters.subject}
                    onChange={(e) => handleFilter('subject', e.target.value)} />
                </TableHead>
                <TableHead>
                  <Input placeholder="Filter by publisher..." value={filters.publisher}
                    onChange={(e) => handleFilter('publisher', e.target.value)} />
                </TableHead>
                {isNotebookTable && <TableHead />}
                <TableHead colSpan={4}></TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {books.map((book) => (
                <TableRow key={book.id}>
                  <TableCell>
                    <Input
                      value={book.bookName}
                      onChange={(e) => onBookUpdate(book.id, "bookName", e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={book.subject}
                      onChange={(e) => onBookUpdate(book.id, "subject", e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={book.publisher}
                      onChange={(e) => onBookUpdate(book.id, "publisher", e.target.value)}
                    />
                  </TableCell>
                  {isNotebookTable && (
                    <TableCell>
                      <Input
                        type="number"
                        value={book.pages || ""}
                        onChange={(e) =>
                          onBookUpdate(book.id, "pages", parseInt(e.target.value) || 0)
                        }
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <Input
                      type="number"
                      value={book.price}
                      onChange={(e) =>
                        onBookUpdate(book.id, "price", parseFloat(e.target.value) || 0)
                      }
                      className="text-right"
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
