import CalculatorDashboard from '@/components/calculator-dashboard';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <CalculatorDashboard />
    </div>
  );
}
