#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './commands/init';

const program = new Command();

program
  .name('stackforge')
  .description('Scaffold production-ready monorepos in one command')
  .version('0.1.0');

program
  .command('init [name]')
  .description('Create a new monorepo project')
  .action(initCommand);

program.parse();
