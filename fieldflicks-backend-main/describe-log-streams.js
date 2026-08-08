const { CloudWatchLogsClient, DescribeLogStreamsCommand } = require('@aws-sdk/client-cloudwatch-logs');

process.env.AWS_ACCESS_KEY_ID = 'AKIAQWHCQGGCHJBLRZMP';
process.env.AWS_SECRET_ACCESS_KEY = '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';
process.env.AWS_REGION = 'ap-south-1';

const cwClient = new CloudWatchLogsClient({ region: 'ap-south-1' });
const LOG_GROUP = '/aws/ecs/default/fieldflix-backend-5006-c00f';

async function main() {
  console.log(`Describing streams for log group: ${LOG_GROUP}...`);
  try {
    const command = new DescribeLogStreamsCommand({
      logGroupName: LOG_GROUP,
      orderBy: 'LastEventTime',
      descending: true,
      limit: 10
    });
    const response = await cwClient.send(command);
    if (!response.logStreams) {
      console.log('No streams found.');
      return;
    }
    console.table(response.logStreams.map(s => ({
      logStreamName: s.logStreamName,
      lastEventTime: new Date(s.lastEventTime).toLocaleString(),
      creationTime: new Date(s.creationTime).toLocaleString()
    })));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
