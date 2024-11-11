#!/usr/bin/env node
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

interface ProjectConfig {
  buildCommand?: string;
  distDir?: string;
  title: string;
  description: string;
  id: string;
}

// Read project configuration from a central config file
const readConfig = (): ProjectConfig[] => {
  try {
    const configPath = path.join(process.cwd(), "projects.json");
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (error) {
    console.error("Error reading config:", error);
    process.exit(1);
  }
};

const buildProject = (projectConfig: ProjectConfig) => {
  const rootDir = process.cwd();
  const projectDir = path.join(rootDir, projectConfig.id);

  // Fail if project directory doesn't exist
  if (!fs.existsSync(projectDir)) {
    console.error(`Project directory not found: ${projectConfig.id}`);
    process.exit(1);
  }

  // Check if project has package.json
  const hasPackageJson = fs.existsSync(path.join(projectDir, "package.json"));

  if (hasPackageJson || projectConfig.buildCommand) {
    console.log(`Building ${projectConfig.title}...`);

    try {
      // Change to project directory
      process.chdir(projectDir);

      // Install dependencies if package.json exists
      if (hasPackageJson) {
        console.log("Installing dependencies...");
        execSync("npm install", { stdio: "inherit" });
      }

      // Run build command
      const buildCommand = projectConfig.buildCommand || "npm run build";
      execSync(buildCommand, { stdio: "inherit" });

      // Move build output to final location
      const distDir = projectConfig.distDir || "dist";
      const distPath = path.join(projectDir, distDir);

      if (!fs.existsSync(distPath)) {
        console.error(`Build directory not found: ${distDir}`);
        process.exit(1);
      }

      // Return to root directory before moving files
      process.chdir(rootDir);

      // Create a temporary directory for the build output
      const tempDir = path.join(rootDir, `${projectConfig.id}-temp`);
      fs.renameSync(distPath, tempDir);

      // Remove existing project directory content
      fs.rmSync(projectDir, { recursive: true });

      // Move build output from temp directory to project directory
      fs.renameSync(tempDir, projectDir);

      console.log(`Successfully built ${projectConfig.title}`);
    } catch (error) {
      console.error(`Error building ${projectConfig.title}:`, error);
      process.exit(1);
    }
  } else {
    console.log(
      `Skipping ${projectConfig.title}: no build configuration found`,
    );
  }
};

const main = () => {
  const projects = readConfig();

  for (const project of projects) {
    buildProject(project);
  }
};

main();
