import fs from 'fs-extra';
import path from 'path';

export async function generateProject(options: Record<string, unknown>) {
  const { projectName, template } = options;
  const outputDir = path.resolve(process.cwd(), projectName as string);

  console.log(`\n⚡ Scaffolding "${projectName}" with template: ${template}`);

  await fs.ensureDir(outputDir);
  // TODO: Copy template files from templates/${template}/ to outputDir

  console.log(`✔ Done! cd ${projectName} && npm run dev`);
}
