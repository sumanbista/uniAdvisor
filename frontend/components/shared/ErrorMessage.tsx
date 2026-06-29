import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type ErrorMessageProps = {
  title?: string;
  message: string;
};

export function ErrorMessage({ title = "Something went wrong", message }: ErrorMessageProps) {
  return (
    <Alert className="border-destructive/40 text-destructive">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
