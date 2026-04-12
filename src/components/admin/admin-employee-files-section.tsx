import { format } from "date-fns";
import { AdminEmployeeFileDeleteForm } from "@/components/admin/admin-employee-file-delete-form";
import { AdminEmployeeFileUploadForm } from "@/components/admin/admin-employee-file-upload-form";

export type AdminEmployeeFileRow = {
  id: string;
  fileName: string;
  contentType: string | null;
  sizeBytes: number;
  description: string | null;
  createdAt: Date;
  uploadedByLabel: string | null;
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function AdminEmployeeFilesSection({
  employeeId,
  adminUserIdForRevalidate,
  files,
}: {
  employeeId: string;
  adminUserIdForRevalidate: string;
  files: AdminEmployeeFileRow[];
}) {
  return (
    <div className="surface-card p-6">
      <h2 className="text-sm font-medium text-slate-800 dark:text-zinc-200">Employee files</h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
        Upload contracts, certifications, or other records. Files are only
        visible to administrators (not shown on the employee app). Maximum 10
        MB per file; stored in your database.
      </p>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <AdminEmployeeFileUploadForm
          employeeId={employeeId}
          adminUserIdForRevalidate={adminUserIdForRevalidate}
        />
      </div>

      {files.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500 dark:text-zinc-500">No files yet.</p>
      ) : (
        <ul className="mt-6 divide-y divide-slate-100 border-t border-slate-100">
          {files.map((f) => (
            <li key={f.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
              <div className="min-w-0 flex-1 space-y-1">
                <a
                  href={`/api/admin/employee-files/${f.id}`}
                  className="text-sm font-medium text-sky-700 hover:underline"
                >
                  {f.fileName}
                </a>
                <p className="text-xs text-slate-500 dark:text-zinc-500">
                  {formatBytes(f.sizeBytes)}
                  {f.contentType ? ` · ${f.contentType}` : null}
                  {" · "}
                  {format(f.createdAt, "MMM d, yyyy h:mm a")}
                  {f.uploadedByLabel ? ` · ${f.uploadedByLabel}` : null}
                </p>
                {f.description ? (
                  <p className="text-sm text-slate-600 dark:text-zinc-400">{f.description}</p>
                ) : null}
              </div>
              <AdminEmployeeFileDeleteForm
                fileId={f.id}
                employeeId={employeeId}
                adminUserIdForRevalidate={adminUserIdForRevalidate}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
