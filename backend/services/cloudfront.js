// CloudFront cache invalidation for the **public BP runtime** distribution.
// CMS calls this after promotion CRUD; mobile clients hit CloudFront → bp-service.
//
// Required env vars:
//   CLOUDFRONT_DISTRIBUTION_ID  — public BP distribution (not cms-dba)
//   AWS_REGION                  — defaults to "us-east-1"
//   AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY  (or an ECS/EC2 IAM role)

const { CloudFrontClient, CreateInvalidationCommand } = require('@aws-sdk/client-cloudfront');

const client = new CloudFrontClient({ region: process.env.AWS_REGION || 'us-east-1' });

async function invalidateBpCache() {
  const distributionId = process.env.CLOUDFRONT_DISTRIBUTION_ID;
  if (!distributionId) return; // no-op in local dev / CI

  await client.send(new CreateInvalidationCommand({
    DistributionId: distributionId,
    InvalidationBatch: {
      CallerReference: String(Date.now()),
      Paths: { Quantity: 1, Items: ['/api/bp*'] },
    },
  }));
  console.log('[cloudfront] invalidated /api/bp*');
}

module.exports = { invalidateBpCache };
