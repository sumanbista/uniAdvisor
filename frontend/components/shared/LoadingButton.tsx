import { Button, type ButtonProps } from "@/components/ui/button";

type LoadingButtonProps = ButtonProps & {
  loading?: boolean;
};

export function LoadingButton({ children, loading = false, disabled, ...props }: LoadingButtonProps) {
  return (
    <Button disabled={disabled || loading} {...props}>
      {loading ? "Loading..." : children}
    </Button>
  );
}
