type BookVocabSignInStateProps = {
  onGoToLogin: () => void;
};

// Sign-in prompt for visitors who reach the private vocabulary list while signed out.
// page.tsx keeps the routing decision; this component only renders the prompt.
export default function BookVocabSignInState({
  onGoToLogin,
}: BookVocabSignInStateProps) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-3 p-6">
      <p className="text-gray-700">You need to sign in.</p>
      <button
        type="button"
        onClick={onGoToLogin}
        className="px-4 py-2 bg-gray-200 rounded"
      >
        Go to Login
      </button>
    </main>
  );
}