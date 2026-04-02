import { requireAdmin } from "@/lib/auth/guards";
import { LocationCreateForm } from "@/components/admin/location-create-form";
import { LocationEditForm } from "@/components/admin/location-edit-form";
import { getLocations } from "@/lib/queries/admin";

export default async function AdminLocationsPage() {
  await requireAdmin();
  const locations = await getLocations();

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <h1 className="text-xl font-semibold text-slate-900">Locations</h1>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-slate-800">Add location</h2>
        <LocationCreateForm />
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-slate-800">All locations</h2>
        {locations.length === 0 ? (
          <p className="text-sm text-slate-500">No locations yet.</p>
        ) : (
          <ul className="space-y-4">
            {locations.map((loc) => (
              <LocationEditForm key={loc.id} loc={loc} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
