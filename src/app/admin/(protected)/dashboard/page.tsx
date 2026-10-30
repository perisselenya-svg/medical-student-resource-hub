import type { Metadata } from "next";
import Link from "next/link";
import { Download, Eye, FileCheck2, FilePen, FolderTree, Library, ListChecks, Tags, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FileTypeIcon } from "@/components/ui/file-type-icon";
import { Table, TBody, Td, Th, THead } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { requireAdminPage } from "@/lib/auth/guard";
import { dashboardStats } from "@/lib/services/stats.service";
import { formatBytes, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

const ACTION_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: "Signed in",
  LOGIN_FAILURE: "Failed sign-in",
  LOGOUT: "Signed out",
  MATERIAL_CREATE: "Uploaded",
  MATERIAL_UPDATE: "Edited",
  MATERIAL_REPLACE_FILE: "Re-uploaded file",
  MATERIAL_DELETE: "Deleted material",
  CATEGORY_CREATE: "Created category",
  CATEGORY_UPDATE: "Edited category",
  CATEGORY_DELETE: "Deleted category",
  TAG_CREATE: "Created tag",
  TAG_UPDATE: "Renamed tag",
  TAG_DELETE: "Deleted tag",
  QUIZ_CREATE: "Created quiz",
  QUIZ_UPDATE: "Edited quiz",
  QUIZ_DELETE: "Deleted quiz",
};

function describe(metadata: unknown): string {
  const m = (metadata ?? {}) as Record<string, unknown>;
  return String(m.title ?? m.name ?? m.email ?? "");
}

export default async function DashboardPage() {
  const admin = await requireAdminPage();
  const { totals, disk, recentUploads, activity } = await dashboardStats();
  const n = (v: number) => v.toLocaleString("en-US");

  const cards = [
    { label: "Total materials", value: n(totals.materials), Icon: Library, href: "/admin/materials" },
    { label: "Published", value: n(totals.published), Icon: FileCheck2, href: "/admin/materials?status=published" },
    { label: "Drafts", value: n(totals.drafts), Icon: FilePen, href: "/admin/materials?status=draft" },
    { label: "Categories", value: n(totals.categories), Icon: FolderTree, href: "/admin/categories" },
    { label: "Tags", value: n(totals.tags), Icon: Tags, href: "/admin/tags" },
    { label: "Total views", value: n(totals.views), Icon: Eye },
    { label: "Total downloads", value: n(totals.downloads), Icon: Download },
    { label: "Quizzes", value: n(totals.quizzes), Icon: ListChecks, href: "/admin/quizzes" },
  ];

  const quickLinks = [
    { href: "/admin/upload", label: "Upload material", Icon: Upload },
    { href: "/admin/materials", label: "Manage materials", Icon: Library },
    { href: "/admin/categories", label: "Categories", Icon: FolderTree },
    { href: "/admin/tags", label: "Tags", Icon: Tags },
    { href: "/admin/quizzes", label: "Quizzes", Icon: ListChecks },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-ink">Dashboard</h1>
        <p className="text-slate-600">
          Welcome back, {admin.name ?? admin.email}. Storage used: {formatBytes(totals.storageBytes)}
          {disk && ` · ${formatBytes(disk.freeBytes)} free on disk`}.
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map(({ label, value, Icon, href }) => {
          const body = (
            <>
              <Icon className="h-5 w-5 text-teal-700" aria-hidden="true" />
              <p className="mt-3 text-2xl font-bold tabular-nums text-ink">{value}</p>
              <p className="text-sm text-slate-600">{label}</p>
            </>
          );
          return (
            <li key={label}>
              {href ? (
                <Link href={href} className="card block h-full p-4 transition hover:border-teal-300 hover:shadow-md">
                  {body}
                </Link>
              ) : (
                <div className="card h-full p-4">{body}</div>
              )}
            </li>
          );
        })}
      </ul>

      <nav aria-label="Quick links">
        <ul className="flex flex-wrap gap-2">
          {quickLinks.map(({ href, label, Icon }, i) => (
            <li key={href}>
              <Link href={href} className={buttonClasses(i === 0 ? "primary" : "secondary")}>
                <Icon className="h-4 w-4" aria-hidden="true" /> {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <Tabs
        label="Recent activity"
        tabs={[
          {
            id: "uploads",
            label: "Recent uploads",
            content:
              recentUploads.length === 0 ? (
                <EmptyState title="Nothing uploaded yet">
                  <Link href="/admin/upload" className="font-medium text-teal-800 underline">
                    Upload your first material
                  </Link>
                </EmptyState>
              ) : (
                <Table label="Recent uploads">
                  <THead>
                    <Th>Title</Th>
                    <Th>Category</Th>
                    <Th>Type</Th>
                    <Th>Status</Th>
                    <Th>Uploaded</Th>
                  </THead>
                  <TBody>
                    {recentUploads.map((m) => (
                      <tr key={m.id}>
                        <Td>
                          <Link href={`/admin/materials/${m.id}`} className="font-medium text-ink hover:underline">
                            {m.title}
                          </Link>
                        </Td>
                        <Td>{m.category.name}</Td>
                        <Td>
                          <FileTypeIcon mimeType={m.mimeType} />
                        </Td>
                        <Td>
                          <Badge tone={m.isPublished ? "success" : "warning"}>{m.isPublished ? "Published" : "Draft"}</Badge>
                        </Td>
                        <Td className="whitespace-nowrap">{formatDate(m.createdAt)}</Td>
                      </tr>
                    ))}
                  </TBody>
                </Table>
              ),
          },
          {
            id: "audit",
            label: "Audit log",
            content: (
              <ul className="card divide-y divide-slate-100 text-sm">
                {activity.length === 0 && <li className="px-5 py-4 text-slate-500">No activity yet.</li>}
                {activity.map((a) => (
                  <li key={a.id} className="px-5 py-2.5">
                    <p className={a.action === "LOGIN_FAILURE" ? "text-red-800" : "text-slate-800"}>
                      <span className="font-medium">{ACTION_LABELS[a.action] ?? a.action}</span> {describe(a.metadata)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {a.adminEmail ?? "unknown"} · <time dateTime={a.createdAt}>{new Date(a.createdAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC</time>
                    </p>
                  </li>
                ))}
              </ul>
            ),
          },
        ]}
      />
    </div>
  );
}
