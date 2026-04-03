

const ActiveAccount = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-3xl font-bold mb-4">Account Activated</h1>
      <p className="text-lg mb-6">Your account has been successfully activated. You can now log in and start using our services.</p>
      <a href="/login" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Go to Login</a>
    </div>
  );
};

export default ActiveAccount;