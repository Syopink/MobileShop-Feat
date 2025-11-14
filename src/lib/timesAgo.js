const moment = require('moment')
require('moment/locale/vi')

const timesAgo = (timeCreated) => moment(timeCreated).fromNow()

module.exports = timesAgo