const ActiveAccount = () => {
  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <h1 className="mb-4 text-3xl font-bold">Account Activated</h1>
      <p className="mb-6 text-lg">
        Your account has been successfully activated. You can now log in and start using our
        services.
      </p>
      <a href="/login" className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
        Go to Login
      </a>
    </div>
  );
};

export default ActiveAccount;
