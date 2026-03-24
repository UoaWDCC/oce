"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Users,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Clock,
  Star,
  Loader2,
  List,
  GraduationCap,
} from "lucide-react";
import Navbar from "./BasicNavbar";
import { API_URL } from "@/utils/config";
import {
  LearningModulesProvider,
  useLearningModules,
} from "@/context/LearningModulesProvider";
import AllModulesSidebar from "./AllModulesSidebar";

type CourseProgress = {
  totalCheckpoints: number;
  completedCheckpoints: number;
  percentage: number;
};

type LearningProgressResponse = {
  categoryProgress: Record<string, CourseProgress>;
};

type ModuleInfo = {
  ModuleID?: string;
  Title: string;
  Category: string;
  CourseID?: string | null;
  checkpoints?: { CheckpointID: string }[];
};

// Normalize category values to match COURSE_CONFIG keys
// Handles variations like "degov"→"dao", "DAO"→"dao", etc.
const CATEGORY_ALIASES: Record<string, string> = {
  dao: "dao",
  degov: "dao",
  defi: "defi",
  basics: "basics",
};

function normalizeCategory(cat: string): string {
  const lower = cat.toLowerCase().trim();
  return CATEGORY_ALIASES[lower] || lower;
}

const COURSE_CONFIG = [
  {
    id: "blockchain-basics",
    title: "Blockchain Basics",
    description:
      "Learn the fundamentals of blockchain technology, cryptography, and how decentralized networks work.",
    icon: <BookOpen className="w-8 h-8" />,
    color: "text-blue-600",
    bgGradient: "from-blue-500 to-blue-600",
    borderColor: "border-blue-200",
    hoverBorder: "hover:border-blue-400",
    bgLight: "bg-blue-50",
    category: "basics",
    link: "/learn/glossary",
  },
  {
    id: "decentralized-governance",
    title: "Decentralized Governance",
    description:
      "Explore DAOs, voting mechanisms, and how communities make decisions on-chain.",
    icon: <Users className="w-8 h-8" />,
    color: "text-purple-600",
    bgGradient: "from-[#5e00b2] to-[#7b2fd6]",
    borderColor: "border-purple-200",
    hoverBorder: "hover:border-purple-400",
    bgLight: "bg-purple-50",
    category: "dao",
    link: "/dao",
  },
  {
    id: "decentralized-finance",
    title: "Decentralized Finance",
    description:
      "Master DeFi concepts including trading, lending, borrowing, and yield strategies.",
    icon: <TrendingUp className="w-8 h-8" />,
    color: "text-green-600",
    bgGradient: "from-green-500 to-emerald-600",
    borderColor: "border-green-200",
    hoverBorder: "hover:border-green-400",
    bgLight: "bg-green-50",
    category: "defi",
    link: "/defi/dex",
  },
];

export default function PortalPage() {
  return (
    <LearningModulesProvider>
      <PortalContent />
    </LearningModulesProvider>
  );
}

function PortalContent() {
  const router = useRouter();
  const supabase = createClient();
  const { openSidebar } = useLearningModules();
  const [showAllModules, setShowAllModules] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState<string>("");
  const [enrolledCourses, setEnrolledCourses] = useState<string[]>([]);
  const [courseProgress, setCourseProgress] = useState<
    Record<string, CourseProgress>
  >({});
  const [compulsoryCourses, setCompulsoryCourses] = useState<Set<string>>(
    new Set(),
  );
  const [optionalCourses, setOptionalCourses] = useState<Set<string>>(
    new Set(),
  );

  const fetchUserData = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Resolve display name + enrolled courses from AllowedUsers
      let displayName = "";
      let courses: string[] = [];

      if (user.email) {
        const allowedResult = await supabase
          .from("AllowedUsers")
          .select("*")
          .ilike("Email", user.email);

        const allowedRows = (allowedResult.data ?? []) as Record<
          string,
          unknown
        >[];

        if (allowedRows.length > 0) {
          const row = allowedRows[0];

          // Try FirstName/LastName first, then fall back to Name
          const parts = [row.FirstName, row.LastName].filter(Boolean);
          if (parts.length > 0) {
            displayName = (parts as string[]).join(" ");
          } else if (row.Name) {
            displayName = row.Name as string;
          }

          // Collect courses from CourseIDs array across all matching rows
          courses = allowedRows.flatMap((r) => {
            const ids = r.CourseIDs;
            return Array.isArray(ids) ? (ids as string[]) : [];
          });
          courses = [...new Set(courses)].filter(Boolean);
        }
      }

      setEnrolledCourses(courses);

      // Fall back to auth user_metadata name
      if (!displayName && user.user_metadata?.name) {
        displayName = user.user_metadata.name as string;
      }

      // Fall back to email prefix
      if (!displayName && user.email) {
        displayName = user.email.split("@")[0];
      }

      setUserName(displayName);

      // Get access token for API calls
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error("No access token");
      }

      // Fetch progress data from the API endpoint
      const progressByCategory: Record<string, CourseProgress> = {};

      const progressResponse = await fetch(`${API_URL}/learning/progress`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (progressResponse.ok) {
        const progressData =
          (await progressResponse.json()) as LearningProgressResponse;

        if (progressData.categoryProgress) {
          Object.keys(progressData.categoryProgress).forEach((rawCategory) => {
            const category = normalizeCategory(rawCategory);
            const catData = progressData.categoryProgress[rawCategory];
            // Merge if multiple raw categories map to the same normalized key
            if (!progressByCategory[category]) {
              progressByCategory[category] = {
                totalCheckpoints: 0,
                completedCheckpoints: 0,
                percentage: 0,
              };
            }
            progressByCategory[category].totalCheckpoints +=
              catData.totalCheckpoints;
            progressByCategory[category].completedCheckpoints +=
              catData.completedCheckpoints;
            // Recalculate percentage
            const total = progressByCategory[category].totalCheckpoints;
            const completed = progressByCategory[category].completedCheckpoints;
            progressByCategory[category].percentage =
              total > 0 ? Math.round((completed / total) * 100) : 0;
          });
        }
      }

      // Fetch modules to determine required vs optional categories
      const modulesResponse = await fetch(`${API_URL}/learning/modules`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (modulesResponse.ok) {
        const modulesJson = (await modulesResponse.json()) as {
          modules: ModuleInfo[];
        };
        const allMods = modulesJson.modules || [];

        // Split into course modules (assigned by tutor) and templates
        const courseMods = allMods.filter((m) => m.CourseID);
        const templateMods = allMods.filter((m) => !m.CourseID);

        // Titles of course modules — used to detect which templates are "already used"
        const courseModTitles = new Set(courseMods.map((m) => m.Title));

        // Required categories: categories that have course modules assigned to the student
        const required = new Set<string>();
        courseMods.forEach((m) => {
          if (m.Category) required.add(normalizeCategory(m.Category));
        });

        // Optional templates: templates whose Title does NOT match any course module
        const unmatchedTemplates = templateMods.filter(
          (t) => !courseModTitles.has(t.Title),
        );

        // Optional categories: every COURSE_CONFIG category that isn't required
        const allCategories = COURSE_CONFIG.map((c) => c.category);
        const optional = new Set<string>(
          allCategories.filter((cat) => !required.has(cat)),
        );

        setCompulsoryCourses(required);
        setOptionalCourses(optional);

        // For optional categories, build progress from template checkpoint counts
        unmatchedTemplates.forEach((t) => {
          const cat = t.Category ? normalizeCategory(t.Category) : null;
          if (!cat || required.has(cat)) return;
          if (!progressByCategory[cat]) {
            progressByCategory[cat] = {
              totalCheckpoints: 0,
              completedCheckpoints: 0,
              percentage: 0,
            };
          }
          progressByCategory[cat].totalCheckpoints +=
            t.checkpoints?.length || 0;
        });
      }

      setCourseProgress(progressByCategory);
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#5e00b2] mx-auto mb-4" />
          <p className="text-gray-600 font-semibold">Loading your portal...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Welcome back{userName ? `, ${userName}` : ""}!
            </h1>
            <p className="text-gray-600 text-lg">
              Continue your blockchain education journey
            </p>
          </div>

          {/* Required Courses */}
          {compulsoryCourses.size > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-bold text-gray-900">
                  Required Courses
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {COURSE_CONFIG.filter((c) =>
                  compulsoryCourses.has(c.category),
                ).map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    progress={courseProgress[course.category]}
                    isCompulsory={true}
                    onClick={() => router.push(course.link)}
                    onViewModules={() =>
                      openSidebar(course.category as "dao" | "defi" | "basics")
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* Optional Courses */}
          {optionalCourses.size > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-gray-500" />
                <h3 className="text-lg font-bold text-gray-900">
                  Optional Courses
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {COURSE_CONFIG.filter((c) =>
                  optionalCourses.has(c.category),
                ).map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    progress={courseProgress[course.category]}
                    isCompulsory={false}
                    onClick={() => router.push(course.link)}
                    onViewModules={() =>
                      openSidebar(course.category as "dao" | "defi" | "basics")
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Total Checkpoints"
              value={Object.values(courseProgress).reduce(
                (sum, p) => sum + p.totalCheckpoints,
                0,
              )}
              icon={<BookOpen className="w-5 h-5" />}
              color="text-blue-600"
              bgColor="bg-blue-50"
            />
            <StatCard
              label="Completed"
              value={Object.values(courseProgress).reduce(
                (sum, p) => sum + p.completedCheckpoints,
                0,
              )}
              icon={<CheckCircle2 className="w-5 h-5" />}
              color="text-green-600"
              bgColor="bg-green-50"
            />
            <StatCard
              label="In Progress"
              value={Object.values(courseProgress).reduce(
                (sum, p) => sum + (p.totalCheckpoints - p.completedCheckpoints),
                0,
              )}
              icon={<Clock className="w-5 h-5" />}
              color="text-amber-600"
              bgColor="bg-amber-50"
            />
            <StatCard
              label="Courses Enrolled"
              value={enrolledCourses.length}
              icon={<Star className="w-5 h-5" />}
              color="text-purple-600"
              bgColor="bg-purple-50"
            />
          </div>
        </div>
      </div>

      {/* Floating Learning Modules Button */}
      <button
        onClick={() => setShowAllModules(true)}
        className="fixed top-24 right-6 flex items-center gap-2 px-6 py-4 bg-gradient-to-r from-[#5e00b2] to-[#7b2fd6] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 font-semibold z-30 hover:scale-105"
      >
        <GraduationCap className="w-5 h-5" />
        <span className="hidden sm:inline">Learning Modules</span>
        <span className="sm:hidden">Learn</span>
      </button>

      <AllModulesSidebar
        isOpen={showAllModules}
        onClose={() => setShowAllModules(false)}
      />
    </>
  );
}

// Course Card Component
function CourseCard({
  course,
  progress,
  isCompulsory,
  onClick,
  onViewModules,
}: {
  course: (typeof COURSE_CONFIG)[0];
  progress?: CourseProgress;
  isCompulsory: boolean;
  onClick: () => void;
  onViewModules: () => void;
}) {
  const prog = progress || {
    totalCheckpoints: 0,
    completedCheckpoints: 0,
    percentage: 0,
  };

  const isCompleted = prog.percentage === 100 && prog.totalCheckpoints > 0;

  return (
    <div
      className={`relative bg-white rounded-2xl border-2 ${course.borderColor} ${course.hoverBorder} p-6 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col text-left group`}
    >
      {/* Compulsory/Optional Badge */}
      <div className="absolute top-4 right-4">
        {isCompulsory ? (
          <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full flex items-center gap-1">
            <Star className="w-3 h-3" />
            Required
          </span>
        ) : (
          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full">
            Optional
          </span>
        )}
      </div>

      {/* Icon */}
      <div
        className={`w-14 h-14 rounded-xl bg-gradient-to-br ${course.bgGradient} flex items-center justify-center text-white mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}
      >
        {course.icon}
      </div>

      {/* Title & Description */}
      <h3 className="text-xl font-bold text-gray-900 mb-2">{course.title}</h3>
      <p className="text-gray-600 text-sm mb-4 flex-grow">
        {course.description}
      </p>

      {/* Progress Section */}
      <div className="mb-4 w-full">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">Progress</span>
          <span
            className={`text-sm font-bold ${isCompleted ? "text-green-600" : course.color}`}
          >
            {prog.completedCheckpoints}/{prog.totalCheckpoints} checkpoints
          </span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${course.bgGradient} transition-all duration-500 rounded-full`}
            style={{ width: `${prog.percentage}%` }}
          />
        </div>
        {isCompleted && (
          <div className="flex items-center gap-1 mt-2 text-green-600">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-semibold">Completed!</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 w-full">
        <button
          onClick={onClick}
          className={`flex-1 py-3 rounded-xl font-bold text-white bg-gradient-to-r ${course.bgGradient} flex items-center justify-center gap-2 hover:shadow-lg active:translate-y-0 active:shadow-md transition-all duration-300 cursor-pointer`}
        >
          <span>
            {prog.percentage === 0
              ? "Start Learning"
              : prog.percentage === 100
                ? "Review"
                : "Continue"}
          </span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
        <button
          onClick={onViewModules}
          className={`px-3 py-3 rounded-xl border-2 ${course.borderColor} ${course.color} hover:bg-gray-50 active:bg-gray-100 transition-all duration-200 cursor-pointer`}
          title="View Modules"
        >
          <List className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  label,
  value,
  icon,
  color,
  bgColor,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="bg-white rounded-xl border-2 border-purple-100 p-4 shadow-md">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <div className={color}>{icon}</div>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500 font-medium">{label}</p>
        </div>
      </div>
    </div>
  );
}
