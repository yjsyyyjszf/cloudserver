const request = require('request');
const async = require('async');
const location = 'trial';
const url = require('url');

const accountId = '01b62720-a732-46dd-864f-4305f48a62c5';
const primaryKey = '56fa60d31c664ab1a5c4ec05f8767b35';

function getAccessToken(cb) {
    const options = {
        headers: {
            'Ocp-Apim-Subscription-Key': primaryKey,
        }
    };
    const getAccessTokenUrl = `https://api.videoindexer.ai/auth/${location}/Accounts/${accountId}/AccessToken?allowEdit=true`;
    request.get(getAccessTokenUrl, options, (err, data) => {
        if (err) {
            console.log('getAccessToken =>> err!!!', err);
            return cb(err);
        }
        console.log('getAccessToken =>> data!!!', data.body);
        return cb(null, data.body.slice(1, -1))
    });
}

function getVideoIndex(videoId) {
    getAccessToken((err, accessToken) => {
        const getVideoIndexUrl = `https://api.videoindexer.ai/${location}/Accounts/${accountId}/Videos/${videoId}/Index?accessToken=${accessToken}&language=English`;
        request.get(getVideoIndexUrl, (err, data) => {
            if (err) {
                console.log('request.get(getVideoIndexUrl =>>> err!!!', err);
                return;
            }
            const body = JSON.parse(data.body);
            if (body.ErrorType) {
                console.log('ErrorType!!!', body.ErrorType);
                return;
            }
            console.log('body!!!', body);
            // SHOULD try catch if exception is thrown.
            // const insights = data.summarizedInsights;
            // const faces = insights.faces;
            // const labels = insights.labels;
            // const audioEffects = insights.audioEffects;
            // console.log('faces!!!', faces);
            // console.log('labels!!!', labels);
            // console.log('audioEffects!!!', audioEffects);
        });
    });
}

function azureHandler(clientIP, req, res, log) {
    console.log('INSIDE azureHandler!!!');
    // req.url === '/_/healthcheck/deep'
    const urlParts = url.parse(req.url, true);
    const query = urlParts.query;
    console.log('query!!!', query);
    console.log('query.id!!!', query.id);

    const videoId = query.id;


    getVideoIndex(videoId);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end();
    return;
}

module.exports = {
    azureHandler,
};
