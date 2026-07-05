interface ErrorMessagePropsType {
  message: string;
}
export default async function ErrorMessage({ message }: ErrorMessagePropsType) {
  return (
    <div className="flex p-5">
      <p>{message}</p>
    </div>
  );
}
