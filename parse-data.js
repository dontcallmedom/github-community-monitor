const fs = require("fs");
const util = require("util");

const issues = {};
const pull_requests = {};
const comments = {};
const contributors = {};
const repos = new Set();

const add_contributors = function (list, repo, type) {
  list.forEach(item => {
    const login = item.user.login;
    if (!contributors[login]) {
      contributors[login] =  [];
    }
    let activity = "comment";
    if (type == "issues") {
      activity = item.pull_request ? "pull_request": "issue";
    }
    contributors[login] = contributors[login].concat([{type: activity, repo, time: item.created_at, href: item.html_url}]);
  });
};

const extract_issue = function(i) {
  return {href: i.html_url, user: i.user.login, time: i.created_at, state: i.state, comments: i.comments};
};

const extract_comment = function(i) {
  return {href: i.html_url, user: i.user.login, time: i.created_at};
};


const loadDir = async dirPath => {
  const files = await util.promisify(fs.readdir)(dirPath);
  return Promise.all(files.map(
    path => util.promisify(fs.readFile)(dirPath + "/" + path, 'utf-8')
      .then(JSON.parse)
      .catch(err => { console.error("Failed parsing " + path + ": " + err);})
      .then(data => {
        const [,repo, datatype] = path.match(/^w3c-([^\.]*)\.(.*)-[0-9]{8}-[0-9]{4}\.json$/);
        repos.add(repo);
        add_contributors(data, repo, datatype);
        switch(datatype) {
        case "issues":
          issues[repo] = data.filter(i => !i.pull_request).map(extract_issue);
          pull_requests[repo] = data.filter(i => !!i.pull_request).map(extract_issue);
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

loadDir(process.argv[2]).then(() => {
  saveJSON("repos.json", [...repos]);
  saveJSON("issues.json", issues);
  saveJSON("pull_requests.json", pull_requests);
  saveJSON("comments.json", comments);
  saveJSON("contributors.json", contributors);
});
