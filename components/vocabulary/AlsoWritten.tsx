export default function AlsoWritten({ value, visible = true }: { value?: string | null; visible?: boolean }) {
  return visible && value?.trim() ? <p className="mt-2 text-sm text-stone-600">Also written: {value.trim()}</p> : null;
}
