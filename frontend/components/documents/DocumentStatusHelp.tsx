import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function DocumentStatusHelp() {
  return (
    <Alert>
      <AlertTitle>Processing order</AlertTitle>
      <AlertDescription>
        After upload, run extraction first, then chunking. Chunking prepares the
        document for RAG search and grounded answers.
      </AlertDescription>
    </Alert>
  );
}
