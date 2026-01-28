import { start, Services } from '@moonactive/microservice-core';
import { Command } from 'commander';
import { IComparisonRunner } from './services/types';

const program = new Command();

program
  .name('chat-comparison-tool')
  .description('CLI for chat comparison tool')
  .version('1.0.0');

program
  .command('runManualComparison')
  .description('Triggers a manual comparison run')
  .option('--teamIds <ids>', 'Comma-separated list of team IDs')
  .option('--channelIds <ids>', 'Comma-separated list of channel IDs')
  .action(async (options) => {
    const teamIds = options.teamIds ? options.teamIds.split(',') : undefined;
    const channelIds = options.channelIds ? options.channelIds.split(',') : undefined;

    process.env['DESCRIPTOR_FILE'] = 'cli-descriptor';

    try {
      await start();
      const comparisonRunner = Services.get('comparisonRunner') as IComparisonRunner;
      
      console.log('Starting manual comparison...');
      const results = await comparisonRunner.runManualComparison(teamIds, channelIds);
      console.log(`Manual comparison finished. Processed ${results.length} channels.`);
      process.exit(0);
    } catch (error) {
      console.error('Failed to run manual comparison:', error);
      process.exit(1);
    }
  });

// If no command is provided, start the microservice normally
if (process.argv.length <= 2) {
  start()
    .catch((e: Error) => {
      console.log(`Error while starting the application: ${e.stack}`);
      process.exit(1);
    });
} else {
  program.parseAsync(process.argv).catch((e: Error) => {
    console.error(`Error while running CLI command: ${e.stack}`);
    process.exit(1);
  });
}
