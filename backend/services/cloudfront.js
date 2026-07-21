// CloudFront cache invalidation helper.
//
// Called fire-and-forget after every CMS write to /api/bp/promotions so that
// the CloudFront edge cache is purged immediately. A failed invalidation is
// logged but never propagated — the in-memory bpCache already holds fresh
// data, so the only consequence is that edge nodes continue serving the old
// response until their TTL expires.
//
// Required env vars:
//   CLOUDFRONT_DISTRIBUTION_ID  — e.g. "E1PA6795UKMFR9"
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
