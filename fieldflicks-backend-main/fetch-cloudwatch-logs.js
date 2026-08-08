const { CloudWatchLogsClient, FilterLogEventsCommand } = require('@aws-sdk/client-cloudwatch-logs');

process.env.AWS_ACCESS_KEY_ID = 'AKIAQWHCQGGCHJBLRZMP';
process.env.AWS_SECRET_ACCESS_KEY = '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';
process.env.AWS_REGION = 'ap-south-1';

const logGroup = '/ecs/devionx-fieldflix-backend';
const cwClient = new CloudWatchLogsClient({ region: 'ap-south-1' });

// We will query for both IDs:
// Backend ID: b5897a55-f787-4946-8baf-f682cb70d477
// Pi Recording ID: ec4e61d3-02c9-43ee-a918-058bdfc059ed
const searchTerms = [
  'b5897a55-f787-4946-8baf-f682cb70d477',
  'ec4e61d3-02c9-43ee-a918-058bdfc059ed'
];

// Time range: June 22, 2026, 14:00:00 IST to 18:30:00 IST
// In UTC: 08:30:00 UTC to 13:00:00 UTC
const startTime = new Date('2026-06-22T08:30:00Z').getTime();
const endTime = new Date('2026-06-22T13:00:00Z').getTime();

async function searchLogs(filterPattern) {
  console.log(`Searching logs with pattern: "${filterPattern}"...`);
  try {
    const command = new FilterLogEventsCommand({
      logGroupName: logGroup,
      filterPattern: filterPattern
    });

    const response = await cwClient.send(command);
    if (!response.events || response.events.length === 0) {
      console.log(`No logs found for pattern: "${filterPattern}"`);
      return;
    }

    console.log(`Found ${response.events.length} log events for pattern: "${filterPattern}":`);
    response.events.forEach(event => {
      const date = new Date(event.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      console.log(`[${date}] ${event.message.trim()}`);
    });
  } catch (error) {
    console.error(`Error querying CloudWatch logs:`, error.message);
  }
}

async function main() {
  for (const term of searchTerms) {
    await searchLogs(term);
    console.log('\n----------------------------------------\n');
  }
}

main();
