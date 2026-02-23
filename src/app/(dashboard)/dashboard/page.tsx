import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
import Topbar from "@/components/layout/Topbar";
import DashboardContent from "./DashboardContent";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const isAdmin = profile.role === "admin";

  // Get counts
  const { count: categoryCount } = await supabase
    .from("categories")
    .select("*", { count: "exact", head: true });

  const { data: tasks } = await supabase.from("tasks").select("status");

  const totalTasks = tasks?.length || 0;
  const todoTasks = tasks?.filter((t) => t.status === "todo").length || 0;
  const inProgressTasks =
    tasks?.filter((t) => t.status === "in_progress").length || 0;
  const doneTasks = tasks?.filter((t) => t.status === "done").length || 0;

  let employeeCount = 0;
  if (isAdmin) {
    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "employee");
    employeeCount = count || 0;
  }

  // Recent announcements
  const { data: announcements } = await supabase
    .from("announcements")
    .select("*, author:profiles!created_by(full_name)")
    .order("created_at", { ascending: false })
    .limit(5);

  // Get user's read announcements
  const { data: reads } = await supabase
    .from("announcement_reads")
    .select("announcement_id")
    .eq("user_id", user.id);

  const readIds = new Set(reads?.map((r) => r.announcement_id) || []);

  // Recent tasks — try with assignees join, fall back if table missing
  let taskResult = await supabase
    .from("tasks")
    .select(
      "*, category:categories(name, color), assignees:task_assignees(profile:profiles(full_name))",
    )
    .order("updated_at", { ascending: false })
    .limit(8);

  if (taskResult.error) {
    taskResult = await supabase
      .from("tasks")
      .select("*, category:categories(name, color)")
      .order("updated_at", { ascending: false })
      .limit(8);
  }

  const recentTasks = (taskResult.data || []).map((t: any) => ({
    ...t,
    assignees: t.assignees?.map((a: any) => a.profile).filter(Boolean) || [],
  }));

  return (
    <>
      <Topbar title="Dashboard" />
      <DashboardContent
        profile={profile}
        stats={{
          totalCategories: categoryCount || 0,
          totalTasks,
          todoTasks,
          inProgressTasks,
          doneTasks,
          totalEmployees: isAdmin ? employeeCount : undefined,
        }}
        announcements={(announcements || []).map((a) => ({
          ...a,
          is_read: readIds.has(a.id),
        }))}
        recentTasks={recentTasks || []}
      />
    </>
  );
}
