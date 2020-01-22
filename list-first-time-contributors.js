const fs = require('fs');
const contributors = require("./contributors.json");

let aMonthAgo = new Date();
aMonthAgo.setMonth(aMonthAgo.getMonth() - 1);
aMonthAgo.setUTCHours(0);
aMonthAgo.setUTCMinutes(0);
const results = {
  since: aMonthAgo.toJSON(),
  contributors: {}
}

Object.keys(contributors).filter(c => contributors[c].length === 1 && contributors[c][0].time > aMonthAgo.toJSON()).sort((a,b) => contributors[a][0].time.localeCompare(contributors[b][0].time))
  .forEach(c => results.contributors[c] = contributors[c][0]);

fs.writeFileSync('first-contributors.json', JSON.stringify(results, null, 2));
