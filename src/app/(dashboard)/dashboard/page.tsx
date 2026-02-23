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

  // Recent tasks — fetch tasks + assignees separately for reliability
  const { data: recentTaskData } = await supabase
    .from("tasks")
    .select("*, category:categories(name, color)")
    .order("updated_at", { ascending: false })
    .limit(8);

  // Fetch assignees for these tasks
  const recentTaskIds = (recentTaskData || []).map((t: any) => t.id);
  let assigneeRows: any[] = [];
  if (recentTaskIds.length > 0) {
    const { data } = await supabase
      .from("task_assignees")
      .select("task_id, user_id")
      .in("task_id", recentTaskIds);
    assigneeRows = data || [];
  }

  // Fetch profiles for assignees
  const assigneeUserIds = [...new Set(assigneeRows.map((r: any) => r.user_id))];
  let assigneeProfiles: any[] = [];
  if (assigneeUserIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", assigneeUserIds);
    assigneeProfiles = data || [];
  }
  const profileLookup = new Map(assigneeProfiles.map((p: any) => [p.id, p]));
  const taskAssignees: Record<string, any[]> = {};
  for (const row of assigneeRows) {
    const prof = profileLookup.get(row.user_id);
    if (prof) {
      if (!taskAssignees[row.task_id]) taskAssignees[row.task_id] = [];
      taskAssignees[row.task_id].push(prof);
    }
  }

  const recentTasks = (recentTaskData || []).map((t: any) => ({
    ...t,
    assignees: taskAssignees[t.id] || [],
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
