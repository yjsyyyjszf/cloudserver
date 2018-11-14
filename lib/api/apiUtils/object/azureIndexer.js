const request = require('request');
const async = require('async');
const metadata = require('../../../metadata/wrapper');
const PassThrough = require('stream').PassThrough;
const { config } = require('../../../Config');

// DOCUMENTATION:
// https://videos.pexels.com/search/bank
// https://www.videoindexer.ai/
// https://api-portal.videoindexer.ai/

// CLI:
// MANAGEMENT_ENDPOINT=http://localhost:5000 PUSH_ENDPOINT=http://localhost:5001 MANAGEMENT_MODE=push NO_PROXY=127.0.0.1 AZURE_LOCATION=trial AZURE_ACCOUNT_ID=<AZURE_ACCOUNT_ID> AZURE_PRIMARY_KEY=<AZURE_PRIMARY_KEY> yarn run start_mongo

// ASYNC AZURE INDEXER PLUGIN STEPS:
// 1 - Get Azure Video Indexer (AVI) API Access Token
// 2 - Upload Video to Azure through AVI API
// 3 - Wait until the video is indexed by Azure (ie. metadata/infos
// have been extracted from the videos)
// 4 - Put these metadatas into CloudServer object's metadata

// NOTE: DO NOT LIKE IT /!\
let location;
let accountId;
let primaryKey;
if (config.azureAccountId) {
    location = config.azureLocation;
    accountId = config.azureAccountId;
    primaryKey = config.azurePrimaryKey;
}

function getAccessToken(log, cb) {
    const options = {
        headers: {
            'Ocp-Apim-Subscription-Key': primaryKey,
        },
    };
    const getAccessTokenUrl = 'https://api.videoindexer.ai/auth/' +
      `${location}/Accounts/${accountId}/AccessToken?allowEdit=true`;
    request.get(getAccessTokenUrl, options, (err, data) => {
        if (err) {
            log.error('GET accessToken failed',
              { method: 'getAccessToken', error: err });
            return cb(err);
        }
        return cb(null, data.body.slice(1, -1));
    });
}

function getVideoIndex(videoId, accessToken, log, cb) {
    const getVideoIndexUrl = `https://api.videoindexer.ai/${location}` +
    `/Accounts/${accountId}/Videos/${videoId}/Index?accessToken=` +
    `${accessToken}&language=English`;
    request.get(getVideoIndexUrl, (err, data) => {
        if (err) {
            log.error('GET videoIndex failed',
              { method: 'GET', url: getVideoIndexUrl, error: err });
            return cb(err);
        }
        // SHOULD try catch if exception is thrown.
        return cb(null, JSON.parse(data.body));
    });
}

function uploadVideo(fileStream, fileName, accessToken, log, callback) {
    const privacy = 'public';
    const uploadVideoUrl = `https://api.videoindexer.ai/${location}` +
        `/Accounts/${accountId}/Videos?accessToken=${accessToken}` +
        `&name=${fileName}&privacy=${privacy}`;
    // const callbackUrl = `http://localhost:8000/_/azurehandler`;
    const formData = {
        /* eslint-disable camelcase */
        my_buffer: fileStream,
        /* eslint-enable camelcase */
    };
    return request.post({ url: uploadVideoUrl, formData },
        (err, httpResponse, body) => {
            if (err) {
                log.error('POST uploadId failed',
                  { method: 'POST', url: uploadVideoUrl, error: err });
                return callback(err);
            }
            const parsedBody = JSON.parse(body);
            if (parsedBody.ErrorType) {
                log.error('POST uploadId failed with response',
                  { method: 'POST', url: uploadVideoUrl,
                    error: parsedBody.ErrorType });
                return callback(parsedBody.ErrorType);
            }
            const videoId = parsedBody.id;
            return callback(null, videoId);
        });
}

function untilVideoIndex(videoId, accessToken, objectContext, log) {
    async.doUntil(
        cb => setTimeout(() => getVideoIndex(videoId, accessToken, log, cb),
            15000),
        data => {
            log.info('processing in progress',
              { method: 'untilVideoIndex',
                fileName: objectContext.objectKey,
                state: data.state,
                processingProgress: data.videos[0].processingProgress,
              });
            return data.state !== 'Uploaded' && data.state !== 'Processing';
        },
        (err, data) => {
            if (err) {
                log.error('processing failed',
                  { method: 'untilVideoIndex',
                    fileName: objectContext.objectKey,
                    error: err,
                  });
                return;
            }
            if (data.ErrorType) {
                log.error('processing failed with response',
                  { method: 'untilVideoIndex',
                    fileName: objectContext.objectKey,
                    error: data.ErrorType,
                  });
                return;
            }
            // const azureTag = data.summarizedInsights.labels.map(label =>
            //     label.name).join(' ');
            const azureTags = {};
            data.summarizedInsights.labels.forEach((label, index) => {
                azureTags[`azurevideoindexer${index}`] = label.name;
            });
            // eslint-disable-next-line no-param-reassign
            // TODO: versioning?
            metadata.getObjectMD(objectContext.bucketName,
            objectContext.objectKey, {}, log, (err, objMD) => {
                if (err) {
                    log.error('getting azure tag failed',
                      { method: 'metadata.getObjectMD',
                        fileName: objectContext.objectKey,
                        error: err,
                      });
                }
                /* eslint no-param-reassign:0 */
                objMD.tags = azureTags;
                const options = objMD.versionId ?
                    { versionId: objMD.versionId } : {};
                metadata.putObjectMD(objectContext.bucketName,
                objectContext.objectKey, objMD, options, log, err => {
                    if (err) {
                        log.error('putting azure tag failed',
                          { method: 'metadata.putObjectMD',
                            fileName: objectContext.objectKey,
                            error: err,
                          });
                    }
                    log.info('putting azure tag successed',
                      { method: 'metadata.putObjectMD',
                        fileName: objectContext.objectKey,
                        tags: objMD.tags,
                      });
                });
            });
        }
    );
}

function indexVideo(fileStream, objectContext, log, _callback) {
    const callback = _callback || (() => {});
    getAccessToken(log, (err, accessToken) => {
        if (err) {
            return callback(err);
        }
        const fileName = objectContext.objectKey;
        const passThrough = new PassThrough();
        // NOTE: DO NOT LIKE IT /!\ Work-around
        fileStream.pipe(passThrough);
        passThrough.headers = fileStream.headers;
        callback(null, passThrough);
        return uploadVideo(fileStream, fileName, accessToken, log,
        (err, videoId) => {
            if (err) {
                return callback(err);
            }
            return untilVideoIndex(videoId, accessToken, objectContext, log);
        });
    });
}

module.exports = {
    indexVideo,
};
