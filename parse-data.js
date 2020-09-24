const fs = require("graceful-fs");
const util = require("util");
const fetch = require("node-fetch");

const issues = {};
const pull_requests = {};
const comments = {};
const contributors = {};
const repos = new Set();

const add_contributors = function (list, type) {
  if (!list.length) return;
  const repo = list[0].url.split('https://api.github.com/repos/')[1].split("/").slice(0,2).join("/");
  repos.add(repo);
  list.forEach(item => {
    const login = item.user.login;
    if (!contributors[login]) {
      contributors[login] =  [];
    }
    let activity = "comment";
    if (type == "issues") {
      activity = item.pull_request ? "pull_request": "issue";
    }
    contributors[login] = contributors[login].concat([{type: activity, repo, time: item.created_at}]);
  });
  return repo;
};

const extract_issue = comments => function(i) {
  return {href: i.html_url, user: i.user.login, time: i.created_at, state: i.state, comments: comments.filter(c => c.issue_url === i.url).map(extract_comment), closed_at: i.closed_at};
};

const extract_comment = function(i) {
  return {href: i.html_url, user: i.user.login, time: i.created_at};
};


const loadComments = async path => {
  return util.promisify(fs.readFile)(path.replace(/\.issues-202/, '.comments-202'), 'utf-8')
    .then(JSON.parse);
}

const loadDir = async (dirPath, repodata) => {
  const files = await util.promisify(fs.readdir)(dirPath);
  const relevantRepos = Object.values(repodata.groups).map(wg => wg.repos.filter(r => r.hasRecTrack).map(r => r.fullName)).flat();
  return Promise.all(files.map(
    path => util.promisify(fs.readFile)(dirPath + "/" + path, 'utf-8')
      .then(JSON.parse)
      .catch(err => { console.error("Failed parsing " + path + ": " + err);})
      .then(async data => {
        const [,, datatype] = path.match(/^([a-zA-Z0-9]*-.*)\.([^\.]*)-[0-9]{8}-[0-9]{4}\.json$/);
        const repo = add_contributors(data, datatype);
        if (!repo) return;
        // For now, we only run more advanced issue analysis on rec track repos
        if (!relevantRepos.includes(repo)) return;
        switch(datatype) {
        case "issues":
          const issueComments = await loadComments(dirPath + "/" + path);
          issues[repo] = data.filter(i => !i.pull_request).map(extract_issue(issueComments));
          pull_requests[repo] = data.filter(i => !!i.pull_request).map(extract_issue(issueComments));
          break;
        case "commit-comments":
        case "comments":
          if (!comments[repo]) {
            comments[repo] = [];
          }
          comments[repo] = comments[repo].concat(data.map(extract_comment));
          break;
        }
      })
  ));
};

const saveJSON = function (path, data) {
  fs.writeFileSync(process.argv[3] + "/" + path, JSON.stringify(data, null, 2));
}

fetch("https://w3c.github.io/validate-repos/report.json").then(r => r.json())
  .then (repodata => loadDir(process.argv[2], repodata)).then(() => {
  saveJSON("repos.json", [...repos]);
  saveJSON("issues.json", issues);
  saveJSON("pull_requests.json", pull_requests);
  saveJSON("comments.json", comments);
  saveJSON("contributors.json", contributors);
});
