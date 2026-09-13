import inquirer from 'inquirer';
import { generateProject } from '../generator';

export async function initCommand(name?: string) {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      default: name || 'my-project',
    },
    {
      type: 'list',
      name: 'template',
      message: 'Choose a template:',
      choices: ['default', 'minimal', 'saas', 'api-only'],
    },
    {
      type: 'confirm',
      name: 'docker',
      message: 'Include Docker Compose?',
      default: true,
    },
    {
      type: 'confirm',
      name: 'ci',
      message: 'Include GitHub Actions CI/CD?',
      default: true,
    },
  ]);

  await generateProject(answers);
}
