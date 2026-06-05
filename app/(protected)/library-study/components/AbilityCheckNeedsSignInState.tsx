type AbilityCheckNeedsSignInStateProps = {
  onGoToLogin: () => void;
};

export default function AbilityCheckNeedsSignInState({
  onGoToLogin,
}: AbilityCheckNeedsSignInStateProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-100 p-6">
      <p className="text-gray-700">
        You need to sign in to use Ability Check.
      </p>

      <button
        type="button"
        onClick={onGoToLogin}
        className="rounded bg-gray-200 px-4 py-2"
      >
        Go to Login
      </button>
    </main>
  );
}
