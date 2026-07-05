import { CircleAlert } from "lucide-react";
interface ErrorMessagePropsType {
  message: string;
}
export default function ErrorMessage({ message }: ErrorMessagePropsType) {
  return (
    <div className="flex py-2 px-4 rounded-lg shadow-2xs  bg-red-300 gap-2 w-fit items-center">
      <CircleAlert size={20} />
      <p className="font-semibold text-sm">{message}</p>
    </div>
  );
}
