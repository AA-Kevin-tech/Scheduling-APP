"use client";

export function UnavailabilityDeleteForm({
  slotId,
  action,
  children,
}: {
  slotId: string;
  action: (formData: FormData) => Promise<void>;
  children?: React.ReactNode;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={slotId} />
      {children}
      <button type="submit" className="text-xs text-red-700 hover:underline">
        Remove block
      </button>
    </form>
  );
}
