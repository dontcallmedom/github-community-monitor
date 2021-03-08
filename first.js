const ol = document.querySelector("ol");
const action = {
  "issue": "raised an issue",
  "comment": "commented",
  "pull_request": "submitted a pull request"
};

fetch("first-contributors.json")
  .then(r => r.json())
  .then(({since,contributors}) => {
    Object.keys(contributors).forEach(c => {
      const contrib = contributors[c];
      const li = document.createElement("li");
      li.appendChild(document.createTextNode(c + " "));
      const a = document.createElement("a");
      a.href = contrib.link;
      a.textContent = action[contrib.type] + " on " + contrib.repo;
      li.appendChild(a);
      li.appendChild(document.createTextNode(" - " + contrib.time));
      if (contrib.type === "issue" || contrib.type === "pull_request") {
        const apiUrl = contrib.link.replace("https://github.com", "https://labs.w3.org/github-cache/v3/repos").replace("/pull/", "/issues/");
        fetch(apiUrl, {mode:'cors'}).then(r => r.json()).then(issue => {
          li.querySelector("a").textContent = `${action[contrib.type]} “${issue.title}” on ${contrib.repo}`;
          const issueBody = document.createElement("pre");
          issueBody.textContent = issue.body;
          li.appendChild(issueBody);
        });
      } else if (contrib.type === "comment") {
        const apiUrl = contrib.link.replace("https://github.com", "https://labs.w3.org/github-cache/v3/repos").replace("/pull/", "/issues/").replace(/#.*$/, '');
        fetch(apiUrl, {mode:'cors'}).then(r => r.json()).then(issue => {
          li.querySelector("a").textContent = `commented on issue “${issue.title}” in ${contrib.repo}`;
        });
      }

      ol.appendChild(li);
    });
  });
