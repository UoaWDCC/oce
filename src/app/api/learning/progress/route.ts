import { NextResponse } from "next/server";
import { supabaseAdmin, createClient } from "@/utils/supabase/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface CheckpointData {
  CheckpointID: string;
  Title: string;
  Description: string;
  Type: string;
  Points: number;
  MinWords?: number;
  MaxWords?: number;
  ModuleID: string;
}

interface ProgressRecord {
  ProgressID: string;
  StudentUID: string;
  CheckpointID: string;
  Status: string;
  CurrentCount?: number;
  StartedAt?: string;
  CompletedAt?: string;
  SubmissionText?: string;
  SubmittedAt?: string;
  Grade?: number;
  Feedback?: string;
  GradedBy?: string;
  GradedAt?: string;
}

interface ModuleRecord {
  ModuleID: string;
  Category: string;
}

interface CheckpointRecord {
  CheckpointID: string;
  ModuleID: string;
  Points: number;
}

export async function POST(request: Request) {
  try {
    // Get access token from headers
    const accessToken = request.headers
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
      error: sessionError,
    } = await supabase.auth.getUser();

    if (sessionError || !user) {
      return NextResponse.json(
        { error: "Invalid auth token" },
        { status: 401, headers: corsHeaders },
      );
    }

    // Fetch the student's auth user to get their email
    let studentAuthEmail: string | null = null;
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(
        user.id,
      );
      studentAuthEmail = authUser?.user?.email || null;
    } catch (e) {
      console.error("Error fetching auth user:", e);
    }

    // Build the student's full list of enrolled course IDs
    const studentCourseIDs: string[] = [];

    // 1. Check AllowedUsers for CourseIDs array
    if (studentAuthEmail) {
      const allowedResult = await supabaseAdmin
        .from("AllowedUsers")
        .select("CourseIDs")
        .ilike("Email", studentAuthEmail)
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

    // 2. Fallback: check Student table for primary CourseID
    if (studentCourseIDs.length === 0) {
      const studentResult = await supabaseAdmin
        .from("Student")
        .select("CourseID")
        .eq("UID", user.id)
        .maybeSingle();

      const studentRow = studentResult.data as {
        CourseID: string | null;
      } | null;

      if (studentRow?.CourseID) {
        studentCourseIDs.push(studentRow.CourseID);
      }
    }

    // Fetch student's submissions (StudentProgress) using admin client
    const { data: progressData } = await supabaseAdmin
      .from("StudentProgress")
      .select("*")
      .eq("StudentUID", user.id)
      .order("SubmittedAt", { ascending: false });

    // Fetch checkpoints for the submissions
    const checkpointIds =
      (progressData as ProgressRecord[] | null)
        ?.map((p) => p.CheckpointID)
        .filter(Boolean) || [];
    let checkpoints: CheckpointData[] = [];

    if (checkpointIds.length > 0) {
      const { data: checkpointsData } = await supabaseAdmin
        .from("Checkpoints")
        .select(
          `
        CheckpointID,
        Title,
        Description,
        Type,
        Points,
        MinWords,
        MaxWords,
        ModuleID
      `,
        )
        .in("CheckpointID", checkpointIds);

      checkpoints = (checkpointsData || []) as CheckpointData[];
    }

    // Calculate progress per category across all enrolled courses
    let totalCheckpointsCount = 0;
    let totalPointsAvailable = 0;
    const categoryProgress: Record<
      string,
      {
        totalCheckpoints: number;
        completedCheckpoints: number;
        percentage: number;
      }
    > = {
      basics: { totalCheckpoints: 0, completedCheckpoints: 0, percentage: 0 },
      dao: { totalCheckpoints: 0, completedCheckpoints: 0, percentage: 0 },
      defi: { totalCheckpoints: 0, completedCheckpoints: 0, percentage: 0 },
    };

    if (studentCourseIDs.length > 0) {
      // Get all modules for ALL of the student's enrolled courses
      const { data: courseModulesData } = await supabaseAdmin
        .from("LearningModules")
        .select("ModuleID, Category")
        .in("CourseID", studentCourseIDs);

      const courseModules = (courseModulesData || []) as ModuleRecord[];
      const courseModuleIds = courseModules.map((m) => m.ModuleID);

      if (courseModuleIds.length > 0) {
        // Fetch all checkpoints for these modules
        const { data: allCourseCheckpointsData } = await supabaseAdmin
          .from("Checkpoints")
          .select("CheckpointID, ModuleID, Points")
          .in("ModuleID", courseModuleIds);

        const allCourseCheckpoints = (allCourseCheckpointsData ||
          []) as CheckpointRecord[];

        if (allCourseCheckpoints.length > 0) {
          totalCheckpointsCount = allCourseCheckpoints.length;
          totalPointsAvailable = allCourseCheckpoints.reduce(
            (sum, checkpoint) => sum + (checkpoint.Points || 0),
            0,
          );

          // Get student's completed/graded checkpoints for these modules
          const allCheckpointIds = allCourseCheckpoints.map(
            (cp) => cp.CheckpointID,
          );
          const { data: studentProgressForCourse } = await supabaseAdmin
            .from("StudentProgress")
            .select("CheckpointID, Status")
            .eq("StudentUID", user.id)
            .in("CheckpointID", allCheckpointIds);

          // Create a set of completed checkpoint IDs
          const completedCheckpointIds = new Set(
            (studentProgressForCourse || [])
              .filter(
                (p) =>
                  (p as { Status: string }).Status === "completed" ||
                  (p as { Status: string }).Status === "graded",
              )
              .map((p) => (p as { CheckpointID: string }).CheckpointID),
          );

          // Group checkpoints by category based on their module
          courseModules.forEach((module) => {
            const rawCategory = module.Category?.toLowerCase();
            // Normalize category to match expected keys
            const category =
              rawCategory === "degov"
                ? "dao"
                : rawCategory === "dao" ||
                    rawCategory === "defi" ||
                    rawCategory === "basics"
                  ? rawCategory
                  : null;

            if (category && categoryProgress[category]) {
              // Get checkpoints for this module
              const moduleCheckpoints = allCourseCheckpoints.filter(
                (cp) => cp.ModuleID === module.ModuleID,
              );

              // Count total checkpoints for this category
              categoryProgress[category].totalCheckpoints +=
                moduleCheckpoints.length;

              // Count completed checkpoints for this category
              const completedInModule = moduleCheckpoints.filter((cp) =>
                completedCheckpointIds.has(cp.CheckpointID),
              ).length;

              categoryProgress[category].completedCheckpoints +=
                completedInModule;
            }
          });

          // Calculate percentages
          Object.keys(categoryProgress).forEach((key) => {
            const cat = categoryProgress[key];
            if (cat.totalCheckpoints > 0) {
              cat.percentage = Math.round(
                (cat.completedCheckpoints / cat.totalCheckpoints) * 100,
              );
            }
          });
        }
      }
    }

    return NextResponse.json(
      {
        categoryProgress,
        totalPointsAvailable,
        totalCheckpointsCount,
        checkpoints,
      },
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    console.error("Error in progress endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders },
    );
  }
}
