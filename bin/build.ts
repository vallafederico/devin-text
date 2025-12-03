import { CONFIG } from "./config";
import type { BuildConfig } from "bun";
import { generateBuildManifest, saveManifestFiles } from "./manifest";
import { cp } from "node:fs/promises";
import { existsSync } from "node:fs";

async function build() {
  const startTime = Date.now();
  console.log("📦 Building production bundle...");
  try {
    // Build JS files
    const result = await Bun.build({
      ...(CONFIG.bun as BuildConfig),
    });

    console.log("result -> []", result);

    // Build CSS files separately
    const cssResult = await Bun.build({
      entrypoints: CONFIG.css.entrypoints,
      outdir: "dist",
      experimentalCss: true,
      sourcemap: "external",
      target: "browser",
      minify: true,
    } as BuildConfig);

    // Copy public directory if it exists
    if (existsSync("public")) {
      console.log("\n📁 Copying public directory...");
      await cp("public", "dist/public", { recursive: true });
      console.log("✅ Public directory copied successfully!");
    }

    const buildDuration = Date.now() - startTime;
    console.log("✅ Build complete!");

    // Log all generated files
    console.log("\n📁 Generated files:");

    // Track .txt files separately
    const txtFiles: string[] = [];

    console.log("\nJavaScript files:");
    for (const output of result.outputs.values()) {
      console.log(`  - ${output.path}`);

      // Create .js.txt copy if it's a JavaScript file
      if (output.path.endsWith(".js")) {
        const txtPath = output.path + ".txt";
        try {
          await cp(output.path, txtPath);
          txtFiles.push(txtPath);
        } catch (copyError) {
          console.warn(
            `⚠️  Failed to create .txt copy of ${output.path}:`,
            copyError
          );
        }
      }
    }

    console.log("\nCSS files:");
    for (const output of cssResult.outputs.values()) {
      console.log(`  - ${output.path}`);
    }

    // Display .txt files in separate section
    if (txtFiles.length > 0) {
      console.log("\n📄 Webflow deployment files (.txt):");
      for (const txtFile of txtFiles) {
        console.log(`  - ${txtFile}`);
      }
    }

    // Generate and save manifest files
    const manifest = generateBuildManifest(result, cssResult, buildDuration);
    saveManifestFiles(manifest);
  } catch (error) {
    console.error("❌ Build failed:", error);
    process.exit(1);
  }
}

build();
