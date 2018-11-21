const assert = require('assert');
const utils = require('../../../lib/data/external/utils');
const BucketInfo = require('arsenal').models.BucketInfo;

const userBucketOwner = 'Bart';
const creationDate = new Date().toJSON();
const bucketOne = new BucketInfo('bucketone',
  userBucketOwner, userBucketOwner, creationDate,
  BucketInfo.currentModelVersion());

const results = [
  { sourceLocationConstraintName: 'scality-internal-mem',
    destLocationConstraintName: 'scality-internal-mem',
    sourceBucketMD: bucketOne,
    destBucketMD: bucketOne,
    boolExpected: false,
    description: 'same bucket metadata',
  },
];

describe('Testing Config.js function: ', () => {
    results.forEach(result => {
        it(`should return ${result.boolExpected} if source location ` +
        `constraint === ${result.sourceLocationConstraintName} ` +
        'and destination location constraint ===' +
        ` ${result.destLocationConstraintName} and ${result.description}`,
        done => {
            const isCopy = utils.externalBackendCopy(
              result.sourceLocationConstraintName,
              result.destLocationConstraintName, result.sourceBucketMD,
              result.destBucketMD);
            assert.strictEqual(isCopy, result.boolExpected);
            done();
        });
    });
});
