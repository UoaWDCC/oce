import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Type definitions
interface ModuleRequest {
  ModuleID?: string;
  Title: string;
  Description: string;
  Category: string;
  OrderIndex?: number;
  CourseID?: string | null;
}

interface LearningModule {
  ModuleID: string;
  Title: string;
  Description: string;
  Category: string;
  OrderIndex: number;
  CourseID: string | null;
  CreatedBy?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
}

interface Checkpoint {
  CheckpointID: string;
  ModuleID: string;
  Title: string;
  Description: string;
  Type: string;
  OrderIndex: number;
  Points: number;
}

interface StudentProgress {
  ProgressID: string;
  StudentUID: string;
  CheckpointID: string;
  Status: string;
  Grade?: number | null;
}

interface UserRoleRecord {
  Role: string;
  CourseID: string | null;
}

// Helper to check if user is tutor or admin
async function checkTutorOrAdminRole(supabase: SupabaseClient, userId: string) {
  const roleResult = await supabase
    .from("UserRoles")
    .select("Role, CourseID")
    .eq("UID", userId);

  const roleData = (roleResult.data ?? []) as UserRoleRecord[];
  if (roleData.length === 0) return false;

  return roleData.some(
    (r) => r.Role === "tutor" || r.Role === "admin" || r.CourseID === "ALL",
  );
}

// Helper to check if user is admin
async function checkAdminRole(supabase: SupabaseClient, userId: string) {
  const roleResult = await supabase
    .from("UserRoles")
    .select("Role, CourseID")
    .eq("UID", userId);

  const roleData = (roleResult.data ?? []) as UserRoleRecord[];
  if (roleData.length === 0) return false;

  return roleData.some((r) => r.Role === "admin" || r.CourseID === "ALL");
}

// Helper function to shift modules order
async function shiftModulesOrder(
  supabase: SupabaseClient,
  courseId: string | null,
  fromIndex: number,
  shift: number,
  operation: "gte" | "gt" | "lte" | "between",
  toIndex?: number,
) {
  let query = supabase.from("LearningModules").select("ModuleID, OrderIndex");

  if (courseId) {
    query = query.eq("CourseID", courseId);
  } else {
    query = query.is("CourseID", null);
  }

  if (operation === "gte") {
    query = query.gte("OrderIndex", fromIndex);
  } else if (operation === "gt") {
    query = query.gt("OrderIndex", fromIndex);
  } else if (operation === "lte") {
    query = query.lte("OrderIndex", fromIndex);
  } else if (operation === "between" && toIndex !== undefined) {
    query = query.gte("OrderIndex", fromIndex).lte("OrderIndex", toIndex);
  }

  const { data: modules, error: fetchError } = await query;

  if (fetchError) throw fetchError;
  if (!modules || modules.length === 0) return;

  const updates = modules.map((mod) =>
    supabase
      .from("LearningModules")
      .update({ OrderIndex: mod.OrderIndex + shift })
      .eq("ModuleID", mod.ModuleID),
  );

  await Promise.all(updates);
}

// GET all modules (anyone can view)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const accessToken = req.headers
      .get("Authorization")
      ?.replace("Bearer ", "");

    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: corsHeaders },
      );
    }

    const supabase = await createClient(accessToken);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Invalid auth token" },
        { status: 401, headers: corsHeaders },
      );
    }

    const roleResult = await supabase
      .from("UserRoles")
      .select("Role, CourseID")
      .eq("UID", user.id);

    const roleData = (roleResult.data ?? []) as UserRoleRecord[];

    const isAdminOrAll = roleData.some(
      (r) => r.Role === "admin" || r.CourseID === "ALL",
    );

    let modules: LearningModule[] = [];

    if (isAdminOrAll) {
      // Admins see everything: templates + all course modules
      const { data, error } = await supabase
        .from("LearningModules")
        .select("*")
        .order("OrderIndex", { ascending: true });

      if (error) throw error;
      modules = (data || []) as LearningModule[];
    } else {
      const isTutor = roleData.some((r) => r.Role === "tutor");

      if (isTutor) {
        const tutorCourseIds = roleData
          .filter((r) => r.Role === "tutor" && r.CourseID)
          .map((r) => r.CourseID as string);

        if (tutorCourseIds.length === 0) {
          return NextResponse.json(
            { error: "Tutor course assignment not found" },
            { status: 403, headers: corsHeaders },
          );
        }

        // Tutors see: templates (CourseID is null) + their course modules
        const [courseResult, templateResult] = await Promise.all([
          supabase
            .from("LearningModules")
            .select("*")
            .in("CourseID", tutorCourseIds)
            .order("OrderIndex", { ascending: true }),
          supabase
            .from("LearningModules")
            .select("*")
            .is("CourseID", null)
            .order("OrderIndex", { ascending: true }),
        ]);

        if (courseResult.error) throw courseResult.error;
        if (templateResult.error) throw templateResult.error;

        modules = [
          ...((templateResult.data || []) as LearningModule[]),
          ...((courseResult.data || []) as LearningModule[]),
        ];
      } else {
        // Students see their course modules + templates for optional learning
        const studentCourseIDs: string[] = [];

        // Primary course from Student table
        const { data: student } = await supabase
          .from("Student")
          .select("CourseID")
          .eq("UID", user.id)
          .single();

        if (student?.CourseID) {
          studentCourseIDs.push(student.CourseID);
        }

        // Additional courses from AllowedUsers (CourseIDs array)
        if (user.email) {
          const allowedResult = await supabase
            .from("AllowedUsers")
            .select("CourseIDs")
            .ilike("Email", user.email)
            .maybeSingle();

          const allowedUser = allowedResult.data as {
            CourseIDs: string[] | null;
          } | null;

          if (allowedUser?.CourseIDs && Array.isArray(allowedUser.CourseIDs)) {
            for (const id of allowedUser.CourseIDs) {
              if (id && !studentCourseIDs.includes(id)) {
                studentCourseIDs.push(id);
              }
            }
          }
        }

        if (studentCourseIDs.length === 0) {
          return NextResponse.json(
            { error: "Student course not found" },
            { status: 403, headers: corsHeaders },
          );
        }

        // Fetch course modules for all enrolled courses + all templates
        const [courseResult, templateResult] = await Promise.all([
          supabase
            .from("LearningModules")
            .select("*")
            .in("CourseID", studentCourseIDs)
            .order("OrderIndex", { ascending: true }),
          supabase
            .from("LearningModules")
            .select("*")
            .is("CourseID", null)
            .order("OrderIndex", { ascending: true }),
        ]);

        if (courseResult.error) throw courseResult.error;
        if (templateResult.error) throw templateResult.error;

        modules = [
          ...((courseResult.data || []) as LearningModule[]),
          ...((templateResult.data || []) as LearningModule[]),
        ];
      }
    }

    // Apply category filter if provided
    if (category) {
      modules = modules.filter((m) => m.Category === category);
    }

    // Fetch checkpoints for all modules
    const moduleIds = modules.map((m) => m.ModuleID);
    let checkpoints: Checkpoint[] = [];
    if (moduleIds.length > 0) {
      const { data } = await supabase
        .from("Checkpoints")
        .select("*")
        .in("ModuleID", moduleIds)
        .order("OrderIndex", { ascending: true });
      checkpoints = (data || []) as Checkpoint[];
    }

    // Fetch student's progress
    const { data: progress } = await supabase
      .from("StudentProgress")
      .select("*")
      .eq("StudentUID", user.id);

    // Organize data
    const modulesWithProgress = modules.map((module) => ({
      ...module,
      checkpoints: checkpoints
        .filter((cp) => cp.ModuleID === module.ModuleID)
        .map((checkpoint) => {
          const checkpointProgress = (
            (progress || []) as StudentProgress[]
          ).find((p) => p.CheckpointID === checkpoint.CheckpointID);
          return {
            ...checkpoint,
            progress: checkpointProgress || null,
          };
        }),
    }));

    return NextResponse.json(
      { modules: modulesWithProgress },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error("Error fetching modules:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders },
    );
  }
}

// POST - Create new module (tutors and admins only)
export async function POST(req: NextRequest) {
  try {
    const accessToken = req.headers
      .get("Authorization")
      ?.replace("Bearer ", "");
    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: corsHeaders },
      );
    }

    const supabase = await createClient(accessToken);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: "Invalid auth token" },
        { status: 401, headers: corsHeaders },
      );
    }

    const hasAccess = await checkTutorOrAdminRole(supabase, user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Only tutors and admins can create modules" },
        { status: 403, headers: corsHeaders },
      );
    }

    const body = (await req.json()) as ModuleRequest;
    const { Title, Description, Category, OrderIndex, CourseID } = body;

    if (!Title || !Description || !Category) {
      return NextResponse.json(
        { error: "Title, Description, and Category are required" },
        { status: 400, headers: corsHeaders },
      );
    }

    const isTemplate = !CourseID;

    if (isTemplate) {
      const isAdminUser = await checkAdminRole(supabase, user.id);
      if (!isAdminUser) {
        return NextResponse.json(
          {
            error:
              "Only admins can create templates (modules without a course)",
          },
          { status: 403, headers: corsHeaders },
        );
      }
    }

    let finalOrderIndex: number;

    if (OrderIndex !== undefined && OrderIndex >= 0) {
      if (!isTemplate) {
        await shiftModulesOrder(supabase, CourseID!, OrderIndex, 1, "gte");
      } else {
        await shiftModulesOrder(supabase, null, OrderIndex, 1, "gte");
      }
      finalOrderIndex = OrderIndex;
    } else {
      let query = supabase
        .from("LearningModules")
        .select("OrderIndex")
        .order("OrderIndex", { ascending: false })
        .limit(1);

      if (isTemplate) {
        query = query.is("CourseID", null);
      } else {
        query = query.eq("CourseID", CourseID!);
      }

      const { data: existingModules, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      finalOrderIndex =
        existingModules && existingModules.length > 0
          ? (existingModules[0].OrderIndex ?? -1) + 1
          : 0;
    }

    const insertData: Record<string, unknown> = {
      Title,
      Description,
      Category,
      OrderIndex: finalOrderIndex,
      CreatedBy: user.id,
    };

    if (!isTemplate) {
      insertData.CourseID = CourseID;
    }

    const { data: newModule, error: insertError } = await supabase
      .from("LearningModules")
      .insert(insertData)
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json(
      { success: true, module: newModule },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error("Error creating module:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders },
    );
  }
}

// PUT - Update module (tutors and admins only)
export async function PUT(req: NextRequest) {
  try {
    const accessToken = req.headers
      .get("Authorization")
      ?.replace("Bearer ", "");
    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: corsHeaders },
      );
    }

    const supabase = await createClient(accessToken);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: "Invalid auth token" },
        { status: 401, headers: corsHeaders },
      );
    }

    const hasAccess = await checkTutorOrAdminRole(supabase, user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Only tutors and admins can update modules" },
        { status: 403, headers: corsHeaders },
      );
    }

    const body = (await req.json()) as ModuleRequest;
    const { ModuleID, Title, Description, Category, OrderIndex, CourseID } =
      body;

    if (!ModuleID) {
      return NextResponse.json(
        { error: "ModuleID is required" },
        { status: 400, headers: corsHeaders },
      );
    }

    const { data: currentModule, error: fetchError } = await supabase
      .from("LearningModules")
      .select("OrderIndex, CourseID")
      .eq("ModuleID", ModuleID)
      .single();

    if (fetchError || !currentModule) {
      return NextResponse.json(
        { error: "Module not found" },
        { status: 404, headers: corsHeaders },
      );
    }

    const isTemplate = !currentModule.CourseID;
    if (isTemplate) {
      const isAdminUser = await checkAdminRole(supabase, user.id);
      if (!isAdminUser) {
        return NextResponse.json(
          { error: "Only admins can edit templates" },
          { status: 403, headers: corsHeaders },
        );
      }
    }

    const oldOrderIndex = currentModule.OrderIndex;
    const newOrderIndex = OrderIndex ?? oldOrderIndex;
    const moduleCourseID = isTemplate
      ? null
      : CourseID || currentModule.CourseID;

    if (oldOrderIndex !== newOrderIndex) {
      await supabase
        .from("LearningModules")
        .update({ OrderIndex: 99999 })
        .eq("ModuleID", ModuleID);

      if (newOrderIndex > oldOrderIndex) {
        let query = supabase
          .from("LearningModules")
          .select("ModuleID, OrderIndex")
          .gt("OrderIndex", oldOrderIndex)
          .lte("OrderIndex", newOrderIndex);

        if (moduleCourseID) {
          query = query.eq("CourseID", moduleCourseID);
        } else {
          query = query.is("CourseID", null);
        }

        const { data: modulesToShift } = await query;

        if (modulesToShift && modulesToShift.length > 0) {
          const updates = modulesToShift.map((mod) =>
            supabase
              .from("LearningModules")
              .update({ OrderIndex: mod.OrderIndex - 1 })
              .eq("ModuleID", mod.ModuleID),
          );
          await Promise.all(updates);
        }
      } else {
        let query = supabase
          .from("LearningModules")
          .select("ModuleID, OrderIndex")
          .gte("OrderIndex", newOrderIndex)
          .lt("OrderIndex", oldOrderIndex);

        if (moduleCourseID) {
          query = query.eq("CourseID", moduleCourseID);
        } else {
          query = query.is("CourseID", null);
        }

        const { data: modulesToShift } = await query;

        if (modulesToShift && modulesToShift.length > 0) {
          const updates = modulesToShift.map((mod) =>
            supabase
              .from("LearningModules")
              .update({ OrderIndex: mod.OrderIndex + 1 })
              .eq("ModuleID", mod.ModuleID),
          );
          await Promise.all(updates);
        }
      }
    }

    const updateData: Record<string, unknown> = {
      Title,
      Description,
      Category,
      OrderIndex: newOrderIndex,
      UpdatedAt: new Date().toISOString(),
    };

    if (!isTemplate) {
      updateData.CourseID = moduleCourseID;
    }

    const { data: updatedModule, error: updateError } = await supabase
      .from("LearningModules")
      .update(updateData)
      .eq("ModuleID", ModuleID)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(
      { success: true, module: updatedModule },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error("Error updating module:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders },
    );
  }
}

// DELETE - Delete module (tutors and admins only)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const moduleId = searchParams.get("moduleId");

    if (!moduleId) {
      return NextResponse.json(
        { error: "ModuleID is required" },
        { status: 400, headers: corsHeaders },
      );
    }

    const accessToken = req.headers
      .get("Authorization")
      ?.replace("Bearer ", "");
    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: corsHeaders },
      );
    }

    const supabase = await createClient(accessToken);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: "Invalid auth token" },
        { status: 401, headers: corsHeaders },
      );
    }

    const hasAccess = await checkTutorOrAdminRole(supabase, user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Only tutors and admins can delete modules" },
        { status: 403, headers: corsHeaders },
      );
    }

    const { data: module, error: fetchError } = await supabase
      .from("LearningModules")
      .select("OrderIndex, CourseID")
      .eq("ModuleID", moduleId)
      .single();

    if (fetchError || !module) {
      return NextResponse.json(
        { error: "Module not found" },
        { status: 404, headers: corsHeaders },
      );
    }

    if (!module.CourseID) {
      const isAdminUser = await checkAdminRole(supabase, user.id);
      if (!isAdminUser) {
        return NextResponse.json(
          { error: "Only admins can delete templates" },
          { status: 403, headers: corsHeaders },
        );
      }
    }

    const { error: deleteError } = await supabase
      .from("LearningModules")
      .delete()
      .eq("ModuleID", moduleId);

    if (deleteError) throw deleteError;

    await shiftModulesOrder(
      supabase,
      module.CourseID,
      module.OrderIndex,
      -1,
      "gt",
    );

    return NextResponse.json(
      { success: true, message: "Module deleted successfully" },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error("Error deleting module:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders },
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}
