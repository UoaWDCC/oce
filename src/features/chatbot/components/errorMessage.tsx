interface ErrorMessagePropsType {
  message: string;
}
export default function ErrorMessage({ message }: ErrorMessagePropsType) {
  return (
    <div className="flex p-5 rounded-xl shadow-2xs outline-1 outline-gray-300">
      <p className="font-semibold">{message}</p>
    </div>
  );
}
