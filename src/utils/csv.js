const { Parser } = require('json2csv');

function toCSV(data) {
  const parser = new Parser();
  return parser.parse(data);
}

module.exports = { toCSV };
