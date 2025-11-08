# **App Name**: EduCalc Pro

## Core Features:

- Excel Upload and Data Separation: Upload Excel files, automatically detect and separate textbooks and notebooks data into separate editable grids.
- Interactive Excel-like Table: Display data in editable tables with columns for Book Name, Subject, Price, Discount (%), Tax (%), and Final Price. Enable automatic recalculation on cell value change.
- Calculation Logic: Dynamically recalculate book prices based on discount and tax rates. Show total textbook price, total notebook price, and grand total.
- Download Final Excel: Allow users to download the analyzed data (including final prices and totals) in Excel format.
- User Inputs and Metadata: Capture class, course combination, discount (%), and tax (%) for textbooks and notebooks before upload to auto-fill respective tables. Allow later edits per book.
- Firebase Integration: Use Google Sign-in for authentication. Store uploaded Excel files in Firebase Storage. Log each upload with a timestamp.

## Style Guidelines:

- Primary color: #2563EB (Blue-600) for a calm, educational feel.
- Background color: #F9FAFB (Gray-50), a very light, desaturated hue of the primary, for a clean backdrop.
- Accent color: #16A34A (Green-500) for CTAs and key actions.
- Font pairing: 'Inter' (sans-serif) for headlines and body text. Inter offers a modern and clean aesthetic, ensuring readability and a contemporary feel suitable for an educational tool.
- Use educational and calculation-related icons for visual clarity.
- Incorporate smooth table fade-in and hover effects for cells using Framer Motion.
- Implement a two-column grid layout for textbooks and notebooks data with a sticky summary panel at the bottom.