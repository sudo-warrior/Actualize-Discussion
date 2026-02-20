import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import Conf from 'conf';
import axios from 'axios';
import { readFileSync, statSync } from 'fs';
import { resolve } from 'path';
import chokidar from 'chokidar';

const config = new Conf({ projectName: 'incident-commander' });
const program = new Command();

program
  .name('ic')
  .description('Incident Commander CLI - AI-powered log analysis')
  .version('0.1.0');

// Configure API endpoint and key
program
  .command('config')
  .description('Configure API endpoint and key')
  .option('-e, --endpoint <url>', 'API endpoint URL')
  .option('-k, --key <key>', 'API key')
  .action((options) => {
    if (options.endpoint) {
      config.set('endpoint', options.endpoint);
      console.log(chalk.green('✓'), 'Endpoint set:', options.endpoint);
    }
    if (options.key) {
      config.set('apiKey', options.key);
      console.log(chalk.green('✓'), 'API key configured');
    }
    if (!options.endpoint && !options.key) {
      console.log(chalk.blue('Current configuration:'));
      console.log('Endpoint:', config.get('endpoint') || chalk.gray('not set'));
      console.log('API Key:', config.get('apiKey') ? chalk.green('configured') : chalk.gray('not set'));
    }
  });

// Analyze logs
program
  .command('analyze')
  .description('Analyze logs from file or stdin')
  .argument('[file]', 'Log file path (or use stdin)')
  .action(async (file) => {
    const endpoint = config.get('endpoint') as string;
    const apiKey = config.get('apiKey') as string;

    if (!endpoint || !apiKey) {
      console.error(chalk.red('✗'), 'Please configure endpoint and API key first:');
      console.log(chalk.gray('  ic config --endpoint https://your-app.com --key your_api_key'));
      process.exit(1);
    }

    const spinner = ora('Reading logs...').start();

    let logs: string;
    try {
      if (file) {
        logs = readFileSync(resolve(file), 'utf-8');
      } else {
        // Read from stdin
        logs = readFileSync(0, 'utf-8');
      }
    } catch (error: any) {
      spinner.fail('Failed to read logs');
      console.error(chalk.red(error.message));
      process.exit(1);
    }

    spinner.text = 'Analyzing logs with AI...';

    try {
      const response = await axios.post(
        `${endpoint}/api/v1/incidents/analyze`,
        { logs },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const incident = response.data;
      spinner.succeed('Analysis complete');

      console.log('\n' + chalk.bold.cyan('═'.repeat(60)));
      console.log(chalk.bold.white(incident.title));
      console.log(chalk.bold.cyan('═'.repeat(60)));

      const severityColors: Record<string, any> = {
        critical: chalk.red.bold,
        high: chalk.red,
        medium: chalk.yellow,
        low: chalk.green
      };
      const severityColor = severityColors[incident.severity] || chalk.white;

      console.log(chalk.gray('Severity:   '), severityColor(incident.severity.toUpperCase()));
      console.log(chalk.gray('Confidence: '), chalk.cyan(`${incident.confidence}%`));
      console.log(chalk.gray('Incident ID:'), chalk.blue(incident.id));

      console.log('\n' + chalk.bold('Root Cause:'));
      console.log(chalk.white(incident.rootCause));

      console.log('\n' + chalk.bold('Recommended Fix:'));
      console.log(chalk.white(incident.fix));

      if (incident.nextSteps?.length > 0) {
        console.log('\n' + chalk.bold('Next Steps:'));
        incident.nextSteps.forEach((step: string, i: number) => {
          console.log(chalk.gray(`  ${i + 1}.`), step);
        });
      }

      console.log('\n' + chalk.gray('View full details:'), chalk.blue(`${endpoint}/incidents/${incident.id}`));

    } catch (error: any) {
      spinner.fail('Analysis failed');
      if (error.response) {
        console.error(chalk.red('Error:'), error.response.data.error || error.response.data.message);
        if (error.response.status === 429) {
          console.log(chalk.yellow('\nRate limit exceeded. Try again later.'));
        }
      } else {
        console.error(chalk.red(error.message));
      }
      process.exit(1);
    }
  });

// List incidents
program
  .command('list')
  .description('List recent incidents')
  .option('-s, --status <status>', 'Filter by status (analyzing, resolved, critical)')
  .option('-l, --limit <number>', 'Number of incidents to show', '10')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const endpoint = config.get('endpoint') as string;
    const apiKey = config.get('apiKey') as string;

    if (!endpoint || !apiKey) {
      console.error(chalk.red('✗'), 'Please configure endpoint and API key first');
      process.exit(1);
    }

    const spinner = options.json ? null : ora('Fetching incidents...').start();

    try {
      const params: any = { limit: options.limit };
      if (options.status) params.status = options.status;

      const response = await axios.get(`${endpoint}/api/v1/incidents`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
        params
      });

      const incidents = response.data.data || response.data;

      if (options.json) {
        console.log(JSON.stringify(incidents, null, 2));
        return;
      }

      spinner?.succeed(`Found ${incidents.length} incident(s)`);

      if (incidents.length === 0) {
        console.log(chalk.gray('\nNo incidents found.'));
        return;
      }

      console.log('');
      incidents.forEach((inc: any) => {
        const severityColors: Record<string, any> = {
          critical: chalk.red.bold,
          high: chalk.red,
          medium: chalk.yellow,
          low: chalk.green
        };
        const severityColor = severityColors[inc.severity] || chalk.white;

        console.log(
          severityColor(`[${inc.severity.toUpperCase()}]`),
          chalk.blue(inc.id.slice(0, 8)),
          chalk.white(inc.title),
          chalk.gray(`(${new Date(inc.createdAt).toLocaleString()})`)
        );
      });

    } catch (error: any) {
      if (spinner) spinner.fail('Failed to fetch incidents');
      console.error(chalk.red(error.response?.data?.error || error.message));
      process.exit(1);
    }
  });

// Get incident details
program
  .command('get')
  .description('Get incident details')
  .argument('<id>', 'Incident ID')
  .option('--json', 'Output as JSON')
  .action(async (id, options) => {
    const endpoint = config.get('endpoint') as string;
    const apiKey = config.get('apiKey') as string;

    if (!endpoint || !apiKey) {
      console.error(chalk.red('✗'), 'Please configure endpoint and API key first');
      process.exit(1);
    }

    const spinner = options.json ? null : ora('Fetching incident...').start();

    try {
      const response = await axios.get(`${endpoint}/api/v1/incidents/${id}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });

      const inc = response.data.data || response.data;

      if (options.json) {
        console.log(JSON.stringify(inc, null, 2));
        return;
      }

      spinner?.succeed('Incident retrieved');

      console.log('\n' + chalk.bold.cyan('═'.repeat(60)));
      console.log(chalk.bold.white(inc.title));
      console.log(chalk.bold.cyan('═'.repeat(60)));

      console.log(chalk.gray('ID:         '), chalk.blue(inc.id));
      console.log(chalk.gray('Severity:   '), chalk.yellow(inc.severity));
      console.log(chalk.gray('Status:     '), chalk.cyan(inc.status));
      console.log(chalk.gray('Confidence: '), `${inc.confidence}%`);
      console.log(chalk.gray('Created:    '), new Date(inc.createdAt).toLocaleString());

      console.log('\n' + chalk.bold('Root Cause:'));
      console.log(inc.rootCause);

      console.log('\n' + chalk.bold('Fix:'));
      console.log(inc.fix);

      if (inc.nextSteps?.length > 0) {
        console.log('\n' + chalk.bold('Next Steps:'));
        inc.nextSteps.forEach((step: string, i: number) => {
          const completed = inc.completedSteps?.includes(i);
          const icon = completed ? chalk.green('✓') : chalk.gray('○');
          console.log(`  ${icon} ${i + 1}. ${step}`);
        });
      }

    } catch (error: any) {
      if (spinner) spinner.fail('Failed to fetch incident');
      console.error(chalk.red(error.response?.data?.error || error.message));
      process.exit(1);
    }
  });

// Update incident status
program
  .command('status')
  .description('Update incident status')
  .argument('<id>', 'Incident ID')
  .argument('<status>', 'New status (analyzing, resolved, critical)')
  .action(async (id, status) => {
    const endpoint = config.get('endpoint') as string;
    const apiKey = config.get('apiKey') as string;

    if (!endpoint || !apiKey) {
      console.error(chalk.red('✗'), 'Please configure endpoint and API key first');
      process.exit(1);
    }

    if (!['analyzing', 'resolved', 'critical'].includes(status)) {
      console.error(chalk.red('✗'), 'Invalid status. Must be: analyzing, resolved, or critical');
      process.exit(1);
    }

    const spinner = ora('Updating status...').start();

    try {
      const response = await axios.patch(
        `${endpoint}/api/v1/incidents/${id}/status`,
        { status },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      spinner.succeed(`Status updated to ${chalk.cyan(status)}`);
    } catch (error: any) {
      spinner.fail('Failed to update status');
      console.error(chalk.red(error.response?.data?.error || error.message));
      process.exit(1);
    }
  });

// Quick resolve alias
program
  .command('resolve')
  .description('Mark incident as resolved')
  .argument('<id>', 'Incident ID')
  .action(async (id) => {
    const endpoint = config.get('endpoint') as string;
    const apiKey = config.get('apiKey') as string;

    if (!endpoint || !apiKey) {
      console.error(chalk.red('✗'), 'Please configure endpoint and API key first');
      process.exit(1);
    }

    const spinner = ora('Resolving incident...').start();

    try {
      await axios.patch(
        `${endpoint}/api/v1/incidents/${id}/status`,
        { status: 'resolved' },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      spinner.succeed(chalk.green('Incident resolved'));
    } catch (error: any) {
      spinner.fail('Failed to resolve incident');
      console.error(chalk.red(error.response?.data?.error || error.message));
      process.exit(1);
    }
  });

// Watch mode for real-time monitoring
program
  .command('watch')
  .description('Watch log file for changes and auto-analyze')
  .argument('[file]', 'Log file to watch')
  .option('-i, --interval <seconds>', 'Check interval in seconds', '5')
  .action(async (file, options) => {
    const endpoint = config.get('endpoint') as string;
    const apiKey = config.get('apiKey') as string;

    if (!endpoint || !apiKey) {
      console.error(chalk.red('✗'), 'Please configure endpoint and API key first');
      process.exit(1);
    }

    if (!file) {
      console.error(chalk.red('✗'), 'Please specify a file to watch');
      process.exit(1);
    }

    const filePath = resolve(file);
    let lastSize = 0;
    let analyzing = false;

    try {
      const stats = statSync(filePath);
      lastSize = stats.size;
    } catch (error: any) {
      console.error(chalk.red('✗'), `File not found: ${filePath}`);
      process.exit(1);
    }

    console.log(chalk.blue('👁'), `Watching ${chalk.cyan(filePath)}`);
    console.log(chalk.gray(`Checking every ${options.interval} seconds. Press Ctrl+C to stop.\n`));

    const analyzeNewContent = async () => {
      if (analyzing) return;

      try {
        const stats = statSync(filePath);
        const currentSize = stats.size;

        if (currentSize > lastSize) {
          analyzing = true;
          const content = readFileSync(filePath, 'utf-8');
          const newContent = content.slice(lastSize);
          lastSize = currentSize;

          if (newContent.trim().length === 0) {
            analyzing = false;
            return;
          }

          console.log(chalk.yellow('📝'), `New content detected (${newContent.length} bytes)`);
          const spinner = ora('Analyzing...').start();

          try {
            const response = await axios.post(
              `${endpoint}/api/v1/incidents/analyze`,
              { logs: newContent },
              {
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json'
                }
              }
            );

            const incident = response.data.data || response.data;
            spinner.succeed('Analysis complete');

            const severityColors: Record<string, any> = {
              critical: chalk.red.bold,
              high: chalk.red,
              medium: chalk.yellow,
              low: chalk.green
            };
            const severityColor = severityColors[incident.severity] || chalk.white;

            console.log(severityColor(`[${incident.severity.toUpperCase()}]`), chalk.white(incident.title));
            console.log(chalk.gray('ID:'), chalk.blue(incident.id));
            console.log(chalk.gray('View:'), chalk.blue(`${endpoint}/incidents/${incident.id}\n`));

          } catch (error: any) {
            spinner.fail('Analysis failed');
            console.error(chalk.red(error.response?.data?.error || error.message));
          }

          analyzing = false;
        }
      } catch (error: any) {
        console.error(chalk.red('Error reading file:'), error.message);
        analyzing = false;
      }
    };

    // Watch file for changes
    const watcher = chokidar.watch(filePath, {
      persistent: true,
      ignoreInitial: true,
    });

    watcher.on('change', analyzeNewContent);

    // Also check periodically (for appends that might be missed)
    const interval = setInterval(analyzeNewContent, parseInt(options.interval) * 1000);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n\n👋 Stopping watch mode...'));
      clearInterval(interval);
      watcher.close();
      process.exit(0);
    });
  });

// Delete incident
program
  .command('delete')
  .description('Delete an incident')
  .argument('<id>', 'Incident ID')
  .option('-y, --yes', 'Skip confirmation')
  .action(async (id, options) => {
    const endpoint = config.get('endpoint') as string;
    const apiKey = config.get('apiKey') as string;

    if (!endpoint || !apiKey) {
      console.error(chalk.red('✗'), 'Please configure endpoint and API key first');
      process.exit(1);
    }

    if (!options.yes) {
      console.log(chalk.yellow('⚠'), 'This will permanently delete the incident.');
      console.log(chalk.gray('Use --yes to skip this confirmation.'));
      process.exit(0);
    }

    const spinner = ora('Deleting incident...').start();

    try {
      await axios.delete(`${endpoint}/api/v1/incidents/${id}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });

      spinner.succeed('Incident deleted');
    } catch (error: any) {
      spinner.fail('Failed to delete incident');
      console.error(chalk.red(error.response?.data?.error || error.message));
      process.exit(1);
    }
  });

program.parse();
