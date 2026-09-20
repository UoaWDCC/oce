import { CircleAlert } from "lucide-react";

interface ErrorMessagePropsType {
  message: string;
  variant?: "error" | "warning";
}

const variantStyles = {
  error: "border-red-200 bg-red-50 text-red-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
} as const;

export default function ErrorMessage({
  message,
  variant = "error",
}: ErrorMessagePropsType) {
  return (
    <div
      className={`flex w-full items-center gap-2 rounded-xl border px-4 py-3 ${variantStyles[variant]}`}
    >
      <CircleAlert aria-hidden="true" className="h-5 w-5 shrink-0" />
      <p className="text-sm font-semibold">{message}</p>
    </div>
  );
}
