const FieldError = ({ error }) =>
  error ? (
    <p role="alert" className="text-xs text-red-500 mt-1">
      {error.message}
    </p>
  ) : null;

export default FieldError;
