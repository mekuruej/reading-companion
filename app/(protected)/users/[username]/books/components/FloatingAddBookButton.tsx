type FloatingAddBookButtonProps = {
  label?: string;
  onClick: () => void;
};

export default function FloatingAddBookButton({
  label = "+ Add a Book",
  onClick,
}: FloatingAddBookButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 rounded-full bg-black px-5 py-3 text-sm font-medium text-white shadow-lg"
    >
      {label}
    </button>
  );
}