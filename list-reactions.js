const fs = require('fs');
const issues = require("./issues.json");
const comments = require("./comments.json");

const issueReactions = [].concat(...Object.values(issues)).filter(i => i.reactions.total_count > 0).sort((a,b) => b.reactions.total_count - a.reactions.total_count);

const commentsReactions = [].concat(...Object.values(comments)).filter(c => c.reactions && c.reactions.total_count > 0).sort((a,b) => b.reactions.total_count - a.reactions.total_count);


fs.writeFileSync('issue-reactions.json', JSON.stringify(issueReactions, null, 2));
fs.writeFileSync('comment-reactions.json', JSON.stringify(commentsReactions, null, 2));
