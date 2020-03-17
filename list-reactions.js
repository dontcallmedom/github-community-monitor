const fs = require('fs');
const issues = require("./issues.json");
const comments = require("./comments.json");

const results = [].concat(...Object.values(issues)).filter(i => i.reactions.total_count > 0).sort((a,b) => b.reactions.total_count - a.reactions.total_count);

fs.writeFileSync('reactions.json', JSON.stringify(results, null, 2));
