import CsvImport from "@/components/CsvImport";

export default function ImportPage() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Import from CSV</h1>
      <p className="text-gray-500 mb-8">
        Import your existing job applications from a spreadsheet.
      </p>
      <CsvImport />
    </main>
  );
}
