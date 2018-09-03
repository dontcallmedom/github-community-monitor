
const body = document.querySelector('body');

const patterns = {
  "neutral": '#1f77b4',
  "comment": '#ff7f0e', "issue": '#2ca02c', "pull_request": "#9467bd",
  "1": '#bedb92', "2-9": '#77c063', "10-29": '#569358', "30-99": '#397a4c', "100+": '#3e6c60'
};

const getColors = (types, custom) => {
  return {pattern: types.map(t => patterns[t]).concat(custom)};
};

const loading = document.createElement("p");
loading.textContent = "Loading data (this may take a while)...";
body.appendChild(loading);
body.setAttribute("aria-busy", true);

Promise.all(['contributors.json', 'repos.json', 'bots.json'].map(p => fetch(p).then(r => r.json())))
  .then(([contributors, repos, bots]) => {
    const isNotABot = n => !bots.includes(n) && n !== "ghost";
    const nonBotContributors = {};
    loading.remove();
    body.setAttribute("aria-busy", false);
    Object.keys(contributors).filter(isNotABot).forEach(c => {
      nonBotContributors[c] = contributors[c].slice().sort((a,b) => a.time.localeCompare(b.time));
    });

    const charts = {"contributions": {title: "Evolution of Github contributions over time", description: "A contribution is either an issue, a comment or a pull request. Contributions from well-known bots are ignored."},
                    "prs": {title: "Evolution of Github pull requests over time"},
                    "contributors": {title: "Evolution of unique contributors over time"},
                    "monthcontributors": {title: "Number of unique contributors in a given month"},
                    "first": {title: "Number of new contributors in a given month"},
                    "repos": {title: "Number of repositories with contributions received during the month"},
                    "contributionsPerContributors": {title: "Number of contributors having made a given number of contributions"},
                    "distribution": {title: "Distribution of most active contributors and contributions across most active repos"},
                    "popularRepos": {title: "Contribution patterns on most popular repositories",
                                     description: "Highlights the repartition of rare vs frequent contributors in a given repository"},
                    "popularRecentRepos": {title: "Contributions received in the past 6 months in the most recently popular repositories"}
                   };
    Object.keys(charts).forEach(id => {
      const section = document.createElement("section");
      const div = document.createElement("div");
      div.id = id;
      if (charts[id].title) {
        const heading = document.createElement("h2");
        heading.textContent = charts[id].title;
        section.appendChild(heading);
      }
      if (charts[id].description) {
        const desc = document.createElement("p");
        desc.textContent = charts[id].description;
        section.appendChild(desc);
      }
      section.appendChild(div);
      body.appendChild(section);
    });
    const months = [...new Set(Object.values(nonBotContributors).map(c => c.map(a => a.time.slice(0,7))).reduce((a,b) => a.concat(b), []))].sort();

    const buildTimeseries = (id, colors, ...data) => {
      return {
        bindto: id,
        data: {
          x: 'x',
          xFormat: '%Y-%m',
          columns: [
            ['x'].concat(months),
            ...data
          ]
        },
        line: { connectNull: true },
        color: colors,
        axis: {
          x: {
            type: 'timeseries',
            tick: {
              format: '%Y-%m'
            }
          }
        }
      };
    };

    c3.generate(
      buildTimeseries('#contributions',
                      getColors(['neutral']),
                      ['Contributions'].concat(months.map(m => Object.values(nonBotContributors).map(c => c.filter(a => a.time.slice(0,7) === m).length).reduce((a,b) => a + b, 0))),
                      ['Contributions (3 months average)'].concat(months.map((m,i, arr) => {
                        if ( i < 2) return null;
                        const threeMonths = arr.slice(i - 2, i + 1);
                        return Math.round(Object.values(nonBotContributors).map(c => c.filter(a => threeMonths.includes(a.time.slice(0,7))).length).reduce((a,b) => a + b, 0) / 3);
                      })),
                      ['Contributions (12 months average)'].concat(months.map((m,i, arr) => {
                        if ( i < 12) return null;
                        const twelveMonths = arr.slice(i - 11, i + 1);
                        return Math.round(Object.values(nonBotContributors).map(c => c.filter(a => twelveMonths.includes(a.time.slice(0,7))).length).reduce((a,b) => a + b, 0) / 12);
                      }))
                     )
    );
    c3.generate(
      buildTimeseries('#prs',
                      getColors(['pull_request']),
                      ['Pull Requests'].concat(months.map(m => Object.values(nonBotContributors).map(c => c.filter(a => a.time.slice(0,7) === m && a.type === "pull_request").length).reduce((a,b) => a + b, 0)))
                     ));
    c3.generate(
      buildTimeseries('#contributors',
                      getColors(['neutral', 'pull_request']),
                      ['Contributors (ever)'].concat(months.map(m => Object.values(nonBotContributors).filter(c => c.find(a => a.time.slice(0,7) <= m)).length)),
                        ['PR Contributors'].concat(months.map(m => Object.values(nonBotContributors).filter(c => c.find(a => a.time.slice(0,7) <= m && a.type === "pull_request")).length))
                       ));

    c3.generate(
      buildTimeseries('#monthcontributors',
                      getColors(['neutral', 'pull_request']),
                      ['Contributors (during that month)'].concat(months.map(m => Object.values(nonBotContributors).filter(c => c.find(a => a.time.slice(0,7) === m)).length)),
                      ['PR Contributors'].concat(months.map(m => Object.values(nonBotContributors).filter(c => c.find(a => a.time.slice(0,7) === m && a.type === "pull_request")).length))
                     ));
    c3.generate(
      buildTimeseries('#first',
                      getColors(['neutral', 'pull_request']),
                      ['First-time contributors'].concat(months.map(m => Object.values(nonBotContributors).filter(c => c[0].time.slice(0,7) === m).length)),
                      ['First-time PR contributors'].concat(months.map(m => Object.values(nonBotContributors).filter(c => (c.find(a => a.type==="pull_request") || {time: ''}).time.slice(0,7) === m).length))
                     ));
    c3.generate(
      buildTimeseries('#repos',
                      getColors(['neutral', 'pull_request'], ['black']),
                      ['Repos with contributions'].concat(months.map(m => Object.values(nonBotContributors).map(c => c.filter(a => a.time.slice(0,7) === m).map(a => a.repo)).reduce((a,b) => new Set([...a, ...b]), new Set()).size)),
                      ['Repos with new pull requests'].concat(months.map(m => Object.values(nonBotContributors).map(c => c.filter(a => a.time.slice(0,7) === m && a.type === "pull_request").map(a => a.repo)).reduce((a,b) => new Set([...a, ...b]), new Set()).size)),
                      ['Total repos'].concat(Array(months.length -1).fill(null)).concat([repos.length])
                     ));
    const contributorsPerRepo = Object.keys(nonBotContributors).map(contributor => nonBotContributors[contributor].map(a => a.repo).reduce((acc, repo) => { if (!acc[repo]) acc[repo] = 0; acc[repo]++; return acc;}, {}));
    const repoContributionRanges = {"total": 0, "1": 0, "2-9": 0, "10-29": 0, "30-99": 0, "100+": 0};
    const numberToRange = n => {
      if (n <= 1) return n;
      if (n>= 2 && n<= 9) return "2-9";
      if (n>=10 && n<=29) return "10-29";
      if (n>=30 && n<=100) return "30-99";
      if (n>=100) return "100+";
      console.error(n + " doesn't match a range");
    };
    const repoPerContributions = contributorsPerRepo
          .reduce((acc, contributor) =>
                  {
                    Object.keys(contributor)
                      .forEach(repo => {
                        if (!acc[repo]) {
                          acc[repo] = {...repoContributionRanges};
                        }
                        acc[repo].total += contributor[repo];
                        acc[repo][numberToRange(contributor[repo])]++;
                      });
                    return acc;
                  }, {});
    const contributionsPerContributors = contributorsPerRepo
          .reduce((acc, contributor) =>
                  {
                    const contributions = Object.keys(contributor)
                          .reduce((a,b) => a + contributor[b], 0);
                    acc[Math.min(contributions, 50)]++;
                    return acc;
                  }, Array(51).fill(0));

    const topRepos = Object.keys(repoPerContributions).sort((a,b) => repoPerContributions[b].total - repoPerContributions[a].total).slice(0,40);
    const topContributors = Object.keys(nonBotContributors).sort((a,b) => nonBotContributors[b].length - nonBotContributors[a].length).slice(0,40);

    const dist = d3.select("#distribution").append("svg").attr('height', 1200).chart("Sankey");
    const nodeNames = topRepos
          .concat(topContributors);
    const links = topContributors
          .map(contributor => {
            const c = nonBotContributors[contributor];
            const cIdx = nodeNames.indexOf(contributor);
            return c.reduce((acc, a) => {
              let repoData = acc.find(x => x.repo === a.repo);
              if (!repoData) {
                repoData = {repo: a.repo, issue: 0, pull_request: 0, comment: 0};
                acc.push(repoData);
              }
              repoData[a.type]++;
              return acc;
            }, []).map(a =>
                       {
                         const repoLinks = [];
                         const repoIdx = nodeNames.indexOf(a.repo);
                         if (repoIdx >= 0) {
                           if (a.issue) {
                             repoLinks.push({
                               source: cIdx,
                               target: repoIdx,
                               value: a.issue,
                               type: "issue"
                             });
                           }
                           if (a.pull_request) {
                             repoLinks.push({
                               source: cIdx,
                               target: repoIdx,
                               value: a.pull_request,
                               type: "pull_request"
                             });
                           }
                           if (a.comment) {
                             repoLinks.push({
                               source: cIdx,
                               target: repoIdx,
                               value: a.comment,
                               type: "comment"
                             });
                           }
                         }
                         return repoLinks;
                       })
          })
          .reduce((a,b) => a.concat(b), [])
          .reduce((a,b) => a.concat(b), [])
          .reduce((acc, link) => {
            const existingLinkIdx = acc.findIndex(l => l.source === link.source && l.target === link.target && l.type === link.type);
            if (existingLinkIdx >= 0) {
              acc[existingLinkIdx].value += link.value;
            } else {
              acc.push(link);
            }
            return acc;
          }, []);
    const nodes = nodeNames.map(node => {
      const nodeIdx = nodeNames.indexOf(node)
      const contributors = links.filter(l => l.target === nodeIdx).reduce((set, link) => set.add(nodeNames[link.source]), new Set());
      const repos = links.filter(l => l.source === nodeIdx).reduce((set, link) => set.add(nodeNames[link.target]), new Set());
      return {name: node, id: node, contributors, repos};
    })
    dist.colorLinks(link => patterns[link.type])
      .colorNodes(node => {
        const n = nodes.find(n => n.name === node);
        if (n.contributors.size)
          return patterns[numberToRange(n.contributors.size)];
        else if (n.repos.size)
          return patterns[numberToRange(n.repos.size)];
      })
      .nodeWidth(24)
      .draw({nodes: nodes,
             links});
    // adjust the width of boxes based on the number of targets / sources
    d3.select("#distribution").selectAll('*[data-node-id] rect')
      .attr('width', node => {
        const n = nodes.find(n => n.name === node.name);
        if (n.contributors.size) {
          return n.contributors.size;
        } else if (n.repos.size) {
          return n.repos.size;
        }
      })
      .attr('x', function(node) {
        const n = nodes.find(n => n.name === node.name);
        if (n.repos.size) {
          return this.x.baseVal.value + (24 - n.repos.size);
        }
      });

    d3.select("#distribution").selectAll('*[data-node-id]')
      .append('title')
      .text(node => {
        const n = nodes.find(n => n.name === node.name);
        if (node.targetLinks.length) {
          const prs = node.targetLinks.filter(link => link.type === "pull_request").reduce((total, link) => total + link.value, 0);
          const issues = node.targetLinks.filter(link => link.type === "issue").reduce((total, link) => total + link.value, 0);
          const comments = node.targetLinks.filter(link => link.type === "comment").reduce((total, link) => total + link.value, 0);
          const contributors = n.contributors;
          return `${node.name} has received ${prs + issues + comments} contributions (${prs} PRs, ${issues} issues, ${comments} comments) from ${contributors.size} contributors (${[...contributors].join(', ')})`;
        } else if (node.sourceLinks.length) {
          const prs = node.sourceLinks.filter(link => link.type === "pull_request").reduce((total, link) => total + link.value, 0);
          const issues = node.sourceLinks.filter(link => link.type === "issue").reduce((total, link) => total + link.value, 0);
          const comments = node.sourceLinks.filter(link => link.type === "comment").reduce((total, link) => total + link.value, 0);
          const repos = n.repos;
          return `${node.name} has made ${prs + issues + comments} contributions (${prs} PRs, ${issues} issues, ${comments} comments) to ${repos.size} repos (${[...repos].join(', ')})`;
        }
      });
    c3.generate({
      bindto: "#popularRepos",
      data: {
        columns: [
          ['contributions'].concat(topRepos.map(repo => repoPerContributions[repo]['total'])),
          ['1'].concat(topRepos.map(repo => repoPerContributions[repo]['1'])),
          ['2-9'].concat(topRepos.map(repo => repoPerContributions[repo]['2-9'])),
          ['10-29'].concat(topRepos.map(repo => repoPerContributions[repo]['10-29'])),
          ['30-99'].concat(topRepos.map(repo => repoPerContributions[repo]['30-99'])),
          ['100+'].concat(topRepos.map(repo => repoPerContributions[repo]['100+']))
        ],
        axes: {
            'contributions': 'y2'
        },
        type: 'bar',
        groups: [['contributions'], ['1', '2-9', '10-29', '30-99', '100+']]
      },
      color: getColors(['1', 'neutral', '2-9', '10-29', '30-99', '100+']),
      axis: {
        x: {
          type: 'category',
          categories: topRepos
        },
        y2: { show: true}
      }
    });

    c3.generate({
      bindto: "#contributionsPerContributors",
      data: {
        columns: [
          ['Number of contributors having made a number of contributions'].concat(contributionsPerContributors)
        ],
        type: 'bar',
      },
      color: getColors(['neutral'])
    });


    const now = new Date();
    const monthAgo = n => { const d = new Date(); d.setMonth(now.getMonth() - n); return d;}
    const recentActivity = a => a.time > monthAgo(6).toJSON();
    const perType = {"comment": 0, "issue": 0, "pull_request": 0};
    const recentContributorsPerRepo = Object.keys(nonBotContributors).map(contributor => nonBotContributors[contributor].filter(recentActivity).reduce((acc, a) => { if (!acc[a.repo]) acc[a.repo] = {...perType}; acc[a.repo][a.type]++; return acc;}, {}));
    const repoPerRecentContributions = recentContributorsPerRepo
          .reduce((acc, contributor) =>
                  {
                    Object.keys(contributor)
                      .forEach(repo => {
                        if (!acc[repo]) {
                          acc[repo] = {...perType};
                          acc[repo].total = 0;
                        }
                        acc[repo].comment += contributor[repo].comment;
                        acc[repo].issue += contributor[repo].issue;
                        acc[repo].pull_request += contributor[repo].pull_request;
                        acc[repo].total += contributor[repo].comment + contributor[repo].issue + contributor[repo].pull_request;
                      });
                    return acc;
                  }, {});
    const topRecentRepos = Object.keys(repoPerRecentContributions).sort((a,b) => repoPerRecentContributions[b].total - repoPerRecentContributions[a].total).slice(0,40);
    c3.generate({
      bindto: "#popularRecentRepos",
      data: {
        columns: [
          ['comments'].concat(topRecentRepos.map(repo => repoPerRecentContributions[repo].comment)),
          ['issues'].concat(topRecentRepos.map(repo => repoPerRecentContributions[repo].issue)),
          ['PRs'].concat(topRecentRepos.map(repo => repoPerRecentContributions[repo].pull_request))
        ],
        type: 'bar',
        groups: [['comments', 'issues', 'PRs']]
      },
      color: getColors(['comment', 'issue', 'pull_request']),
      axis: {
        x: {
          type: 'category',
          categories: topRecentRepos
        }
      }
    });
  }).catch(console.error.bind(console));
