import { CircleAlert } from "lucide-react";
interface ErrorMessagePropsType {
  message: string;
}
export default function ErrorMessage({ message }: ErrorMessagePropsType) {
  return (
    <div className="flex w-full items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
      <CircleAlert aria-hidden="true" className="h-5 w-5 shrink-0" />
      <p className="text-sm font-semibold">{message}</p>
    </div>
  );
}
