import { Elysia } from "elysia";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { packageSkillAsscn, packages, skills } from "../../db/schema";
import { normalizeArray, parseJsonArray, toNumber } from "../../utils/parse";

type SuggestedSkill = {
  id: number;
  name: string;
  title: string;
  description: string | null;
  repo: string;
  installs: number;
  packages: string[];
  match_type: "package_json" | "installed_skill";
};

function buildSkillLookup(skillId: string) {
  const numericId = Number(skillId);
  if (Number.isInteger(numericId) && String(numericId) === skillId) {
    return eq(skills.id, numericId);
  }
  return eq(skills.name, skillId);
}

export const skillsRoutes = new Elysia().group("/api/v1/skills", (app) =>
  app
    .get("/suggest", async ({ request, set }) => {
      const url = new URL(request.url);
      const packageList = normalizeArray(url.searchParams.getAll("packages"));
      const installedSkills = normalizeArray(
        url.searchParams.getAll("installed_skills"),
      );
      const limitValue = Number(url.searchParams.get("limit") ?? "10");
      const limit =
        Number.isFinite(limitValue) && limitValue > 0 ? limitValue : 10;

      if (packageList.length === 0 && installedSkills.length === 0) {
        set.status = 400;
        return {
          error:
            "At least one 'packages' or 'installed_skills' value is required.",
        };
      }

      const matchedInstalledRows =
        installedSkills.length > 0
          ? await db
              .select({ id: skills.id, name: skills.name })
              .from(skills)
              .where(inArray(skills.name, installedSkills))
          : [];
      const matchedInstalledSkillIds = matchedInstalledRows.map((row) => row.id);
      const matchedInstalledSkills = matchedInstalledRows.map(
        (row) => row.name,
      );

      const responseSkills = new Map<number, SuggestedSkill>();
      const excludeSkillIds = new Set<number>();

      const matchedPackages = new Set<string>();
      if (packageList.length > 0) {
        const packageConditions = [inArray(packages.name, packageList)];
        if (matchedInstalledSkillIds.length > 0) {
          packageConditions.push(
            notInArray(skills.id, matchedInstalledSkillIds),
          );
        }

        const packageMatches = await db
          .select({
            dbId: skills.id,
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
          .where(and(...packageConditions))
          .groupBy(skills.id);

        for (const row of packageMatches) {
          const rowPackages = parseJsonArray(row.packages);
          for (const pkg of rowPackages) matchedPackages.add(pkg);
          responseSkills.set(row.dbId, {
            id: row.dbId,
            name: row.name,
            title: row.title,
            description: row.description,
            repo: row.repo,
            installs: row.installs,
            packages: rowPackages,
            match_type: "package_json",
          });
          excludeSkillIds.add(row.dbId);
        }
      }

      const installedPackagesRows =
        matchedInstalledSkillIds.length > 0
          ? await db
              .select({ name: packages.name })
              .from(packages)
              .innerJoin(
                packageSkillAsscn,
                eq(packages.id, packageSkillAsscn.packageId),
              )
              .where(
                inArray(packageSkillAsscn.skillId, matchedInstalledSkillIds),
              )
          : [];
      const installedPackages = Array.from(
        new Set(installedPackagesRows.map((row) => row.name)),
      );

      if (installedPackages.length > 0) {
        const excludeIds = Array.from(excludeSkillIds);
        const conditions = [
          inArray(packages.name, installedPackages),
          notInArray(skills.id, matchedInstalledSkillIds),
        ];
        if (excludeIds.length > 0) {
          conditions.push(notInArray(skills.id, excludeIds));
        }

        const installedSkillMatches = await db
          .select({
            dbId: skills.id,
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
          .where(and(...conditions))
          .groupBy(skills.id);

        for (const row of installedSkillMatches) {
          responseSkills.set(row.dbId, {
            id: row.dbId,
            name: row.name,
            title: row.title,
            description: row.description,
            repo: row.repo,
            installs: row.installs,
            packages: parseJsonArray(row.packages),
            match_type: "installed_skill",
          });
          excludeSkillIds.add(row.dbId);
        }
      }

      const sorted = Array.from(responseSkills.values()).sort((a, b) => {
        if (a.match_type !== b.match_type) {
          return a.match_type === "package_json" ? -1 : 1;
        }
        const installsA = toNumber(a.installs);
        const installsB = toNumber(b.installs);
        if (installsA !== installsB) return installsB - installsA;
        return a.name.localeCompare(b.name);
      });

      const limited = sorted.slice(0, limit);

      return {
        skills: limited,
        total: sorted.length,
        matched_packages: Array.from(matchedPackages),
        matched_installed_skills: Array.from(matchedInstalledSkills),
      };
    })
    .get("/:skillId", async ({ params, set }) => {
      const rows = await db
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
        .leftJoin(
          packageSkillAsscn,
          eq(skills.id, packageSkillAsscn.skillId),
        )
        .leftJoin(packages, eq(packages.id, packageSkillAsscn.packageId))
        .where(buildSkillLookup(params.skillId))
        .groupBy(skills.id)
        .limit(1);

      const skill = rows[0];
      if (!skill) {
        set.status = 404;
        return { error: "Skill not found." };
      }
      return {
        ...skill,
        packages: parseJsonArray(skill.packages),
      };
    }),
);
