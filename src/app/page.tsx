import { ArrowRight, Calculator, HardDrive } from 'lucide-react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import Header from '@/components/header';

export default function DashboardHub() {
  return (
    <>
      <Header />
      <main className="container flex-grow py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-primary">
            Welcome to EduBook Manager
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Choose an option below to get started.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2">
          <Link href="/calculator" className="group">
            <Card className="flex h-full flex-col shadow-lg transition-all group-hover:scale-[1.02] group-hover:shadow-xl">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Calculator className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-2xl text-primary">
                    Price Calculator
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <CardDescription>
                  Upload an Excel file with book lists, manually edit details,
                  apply discounts, and calculate final prices for a specific
                  class.
                </CardDescription>
              </CardContent>
              <div className="p-6 pt-0">
                <div className="flex items-center font-semibold text-primary">
                  Go to Calculator
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/explorer" className="group">
            <Card className="flex h-full flex-col shadow-lg transition-all group-hover:scale-[1.02] group-hover:shadow-xl">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                    <HardDrive className="h-6 w-6 text-accent" />
                  </div>
                  <CardTitle className="text-2xl text-accent">
                    Data Explorer
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <CardDescription>
                  View, filter, and search all your saved book data. Filter by
                  class or publisher to easily find the information you need.
                </CardDescription>
              </CardContent>
              <div className="p-6 pt-0">
                <div className="flex items-center font-semibold text-accent">
                  Explore Data
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Card>
          </Link>
        </div>
      </main>
    </>
  );
}
