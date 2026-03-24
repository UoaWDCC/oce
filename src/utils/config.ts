export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";
// export const API_URL =
//   typeof window === "undefined"
//     ? "http://localhost:3000/api" // Server-side: absolute URL
//     : process.env.NEXT_PUBLIC_API_URL || "/api"; // Client-side: relative URL
