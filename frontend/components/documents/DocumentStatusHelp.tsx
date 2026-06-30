import { InfoNote } from "@/components/shared/InfoNote";

export function DocumentStatusHelp() {
  return (
    <InfoNote title="Processing order">
      After upload, run extraction first, then chunking. Chunking prepares the document for RAG search and grounded answers.
    </InfoNote>
  );
}
