import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type ErrorMessageProps = {
  title?: string;
  message: string;
};

export function ErrorMessage({ title = "Something went wrong", message }: ErrorMessageProps) {
  return (
    <Alert className="border-destructive/30 bg-red-50 text-red-950" role="alert">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
