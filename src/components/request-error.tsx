type RequestErrorProps = { message: string; onRetry?: () => void };

export const RequestError = ({
  message,
  onRetry,
}: RequestErrorProps): React.JSX.Element => (
  <div className="text text_type_main-default mt-10 mb-5" role="alert">
    <p>{message}</p>
    {onRetry && (
      <button type="button" onClick={onRetry}>
        Повторить запрос
      </button>
    )}
  </div>
);
