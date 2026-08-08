const { CloudWatchLogsClient, DescribeLogGroupsCommand } = require('@aws-sdk/client-cloudwatch-logs');

process.env.AWS_ACCESS_KEY_ID = 'AKIAQWHCQGGCHJBLRZMP';
process.env.AWS_SECRET_ACCESS_KEY = '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';
process.env.AWS_REGION = 'ap-south-1';

const cwClient = new CloudWatchLogsClient({ region: 'ap-south-1' });

async function main() {
  console.log('Listing log groups in ap-south-1...');
  try {
    const command = new DescribeLogGroupsCommand({ limit: 50 });
    const response = await cwClient.send(command);
    
    if (!response.logGroups) {
      console.log('No log groups found.');
      return;
    }
    
    console.table(response.logGroups.map(lg => ({ logGroupName: lg.logGroupName, creationTime: new Date(lg.creationTime).toLocaleString() })));
  } catch (error) {
    console.error('Error listing log groups:', error.message);
  }
}

main();
