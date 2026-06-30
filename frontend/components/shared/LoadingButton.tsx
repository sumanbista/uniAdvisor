import { Button, type ButtonProps } from "@/components/ui/button";

type LoadingButtonProps = ButtonProps & {
  loading?: boolean;
  loadingLabel?: string;
};

export function LoadingButton({ children, loading = false, loadingLabel = "Loading...", disabled, ...props }: LoadingButtonProps) {
  return (
    <Button disabled={disabled || loading} {...props}>
      {loading ? loadingLabel : children}
    </Button>
  );
}
