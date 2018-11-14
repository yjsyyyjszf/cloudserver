const { healthcheckHandler } = require('./healthcheckHandler');
const routeBackbeat = require('../routes/routeBackbeat');
const routeMetadata = require('../routes/routeMetadata');
const { reportHandler } = require('./reportHandler');
const { monitoringHandler } = require('./monitoringHandler');
const { azureHandler } = require('./azureHandler');

const internalHandlers = {
    healthcheck: healthcheckHandler,
    backbeat: routeBackbeat,
    report: reportHandler,
    monitoring: monitoringHandler,
    metadata: routeMetadata,
    azurehandler: azureHandler,
};

module.exports = {
    internalHandlers,
};
