interface FieldErrorProps {
  error?: { message?: string } | null;
}

const FieldError = ({ error }: FieldErrorProps) =>
  error ? (
    <p role="alert" className="text-xs text-red-500 mt-1">
      {error.message}
    </p>
  ) : null;

export default FieldError;
