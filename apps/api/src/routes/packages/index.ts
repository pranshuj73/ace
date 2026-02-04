import { Elysia } from "elysia";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { packageSkillAsscn, packages, skills } from "@/db/schema";
import { parseJsonArray } from "@/utils/parse";

export const packagesRoutes = new Elysia().group(
  "/api/v1/packages",
  (app) =>
    app.get("/:packageName/skills", async ({ params, request }) => {
      const url = new URL(request.url);
      const limitValue = Number(url.searchParams.get("limit") ?? "50");
      const limit =
        Number.isFinite(limitValue) && limitValue > 0 ? limitValue : 50;

      const matched = await db
        .select({
          id: skills.id,
          name: skills.name,
          title: skills.title,
          description: skills.description,
          repo: skills.repo,
          installs: skills.installs,
          packages: sql<string>`json_group_array(${packages.name})`,
        })
        .from(skills)
        .innerJoin(
          packageSkillAsscn,
          eq(skills.id, packageSkillAsscn.skillId),
        )
        .innerJoin(packages, eq(packages.id, packageSkillAsscn.packageId))
        .where(eq(packages.name, params.packageName))
        .groupBy(skills.id)
        .orderBy(desc(skills.installs))
        .limit(limit);

      const response = matched.map((row) => ({
        ...row,
        packages: parseJsonArray(row.packages),
      }));

      return { package: params.packageName, skills: response };
    }),
);
