#!/usr/bin/env node
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import ignore from "ignore";

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

// Helper function to read gitignore patterns
const getIgnorePatterns = (dir: string): string[] => {
  const patterns = [
    "node_modules",
    "dist",
    ".git",
    ".DS_Store", // Common macOS system file
  ];

  const gitignorePath = path.join(dir, ".gitignore");
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, "utf8");
    patterns.push(
      ...gitignoreContent
        .split("\n")
        .filter((line) => line.trim() && !line.startsWith("#")),
    );
  }

  return patterns;
};

// Helper function to copy directory recursively while respecting gitignore
const copyDir = (src: string, dest: string) => {
  const ig = ignore().add(getIgnorePatterns(src));

  const copyRecursive = (
    currentSrc: string,
    currentDest: string,
    relativePath: string = "",
  ) => {
    // Create destination directory if it doesn't exist
    if (!fs.existsSync(currentDest)) {
      fs.mkdirSync(currentDest, { recursive: true });
    }

    // Read directory contents
    const entries = fs.readdirSync(currentSrc, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(currentSrc, entry.name);
      const destPath = path.join(currentDest, entry.name);
      const entryRelativePath = path.join(relativePath, entry.name);

      // Skip if file/directory is ignored
      if (ig.ignores(entryRelativePath)) {
        continue;
      }

      if (entry.isDirectory()) {
        copyRecursive(srcPath, destPath, entryRelativePath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  };

  copyRecursive(src, dest);
};

const buildProject = (projectConfig: ProjectConfig) => {
  const rootDir = process.cwd();
  const projectDistDir = path.join(rootDir, "dist", projectConfig.id);

  // Fail if project directory doesn't exist
  if (!fs.existsSync(projectDistDir)) {
    console.error(`Project directory not found: ${projectConfig.id}`);
    process.exit(1);
  }

  // Check if project has package.json in the dist directory
  const hasPackageJson = fs.existsSync(
    path.join(projectDistDir, "package.json"),
  );

  if (hasPackageJson || projectConfig.buildCommand) {
    console.log(`Building ${projectConfig.title}...`);

    try {
      // Change to project dist directory
      process.chdir(projectDistDir);

      // Install dependencies if package.json exists
      if (hasPackageJson) {
        console.log("Installing dependencies...");
        execSync("npm install", { stdio: "inherit" });
      }

      // Run build command
      const buildCommand = projectConfig.buildCommand || "npm run build";
      execSync(buildCommand, { stdio: "inherit" });

      // Handle build output
      const distDir = projectConfig.distDir || "dist";
      const buildDistPath = path.join(projectDistDir, distDir);

      if (!fs.existsSync(buildDistPath)) {
        console.error(`Build directory not found: ${distDir}`);
        process.exit(1);
      }

      // Return to root directory before moving files
      process.chdir(rootDir);

      // Create a temporary directory for the build output
      const tempDir = path.join(rootDir, `${projectConfig.id}-temp`);
      fs.renameSync(buildDistPath, tempDir);

      // Remove existing dist directory content
      fs.rmSync(projectDistDir, { recursive: true });

      // Move build output from temp directory to dist directory
      fs.renameSync(tempDir, projectDistDir);

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

  // Create main dist directory if it doesn't exist
  const distDir = path.join(process.cwd(), "dist");
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir);
  }
  copyDir(process.cwd(), distDir);

  for (const project of projects) {
    buildProject(project);
  }
};

main();
