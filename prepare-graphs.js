const fs = require("fs");
const util = require("util");

Promise.all([util.promisify(fs.readFile)("contributors.json", 'utf-8'),
             util.promisify(fs.readFile)("repos.json", 'utf-8'),
             util.promisify(fs.readFile)("bots.json", 'utf-8'),
             util.promisify(fs.readFile)("wg-repos.json", 'utf-8')
            ])
  .then(contents => contents.map(c => JSON.parse(c)))
  .then(([contributors, repos, bots, wgrepos]) => {
    const isNotABot = n => !bots.includes(n) && n !== "ghost";
    const nonBotContributors = {};
    Object.keys(contributors).filter(isNotABot).forEach(c => {
      nonBotContributors[c] = contributors[c].slice().sort((a,b) => a.time.localeCompare(b.time));
    });

    const ossRepos = [/^web-platform-tests/i, /^w3c\/respec/, /^w3c\/webidl2\.js/];
    const intransitionWGRepos = [/^WebAssembly/i, /^immersive-web/i, /^w3c\/distributed-tracing/, /^w3c\/json-ld/, , /^w3c\/reporting/, /w3c\/wot/, /w3c\/silver/, /w3c\/network-error-logging/, /w3c\/webrtc-quic/, /w3c\/editing/, /w3c\/vc-use-cases/];
    const igRepos = [/w3c\/sdw/, /w3c\/sealreq/, /w3c\/iip/, /w3c\/media-and-entertainment/];
    const maintenanceRepos = [/w3c\/media-source/, /^w3c\/webdriver/, /w3c\/activitystreams/, /w3c\/activitypub/];
    const processRepos = [/^w3ctag\//, /w3c\/w3process/, /w3c\/transitions/, /w3c\/AB/, /w3c\/charter-timed-text/, /w3c\/strategy/, /w3c\/wg-effectiveness/, /w3c\/echidna/, /w3c\/spec-generator/];
    const siteRepos = [/w3c\/wai-website/, /w3c\/web-roadmaps/, /w3c\/tr-pages/, /w3c\/wai-roles-responsbilities/, /w3c\/bcase/];
    const notCGRegExps = ossRepos.concat(intransitionWGRepos).concat(igRepos).concat(processRepos).concat(siteRepos).concat(wgrepos.map(r => new RegExp(r, 'i')));
    const notCG = n => notCGRegExps.some(r => n.match(r));

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


    const months = [...new Set(Object.values(nonBotContributors).map(c => c.map(a => a.time.slice(0,7))).reduce((a,b) => a.concat(b), []))].sort();

    const graphs = {
      '__shareddata': {
        months,
        topRepos
      },
      'contributions': {
        columns: [
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
        ]
      },
      'prs': {
        columns: [
          ['Pull Requests'].concat(months.map(m => Object.values(nonBotContributors).map(c => c.filter(a => a.time.slice(0,7) === m && a.type === "pull_request").length).reduce((a,b) => a + b, 0)))
          ]
      },
      'contributors': {
        columns: [
          ['Contributors (ever)'].concat(months.map(m => Object.values(nonBotContributors).filter(c => c.find(a => a.time.slice(0,7) <= m)).length)),
          ['PR Contributors'].concat(months.map(m => Object.values(nonBotContributors).filter(c => c.find(a => a.time.slice(0,7) <= m && a.type === "pull_request")).length))
        ]
      },
      'monthcontributors': {
        columns: [
          ['Contributors (during that month)'].concat(months.map(m => Object.values(nonBotContributors).filter(c => c.find(a => a.time.slice(0,7) === m)).length)),
          ['PR Contributors'].concat(months.map(m => Object.values(nonBotContributors).filter(c => c.find(a => a.time.slice(0,7) === m && a.type === "pull_request")).length))
        ]
      },
      'first': {
        columns: [
          ['First-time contributors'].concat(months.map(m => Object.values(nonBotContributors).filter(c => c[0].time.slice(0,7) === m).length)),
          ['First-time PR contributors'].concat(months.map(m => Object.values(nonBotContributors).filter(c => (c.find(a => a.type==="pull_request") || {time: ''}).time.slice(0,7) === m).length))
        ]
      },
      'repos': {
        columns: [
          ['Repos with contributions'].concat(months.map(m => Object.values(nonBotContributors).map(c => c.filter(a => a.time.slice(0,7) === m).map(a => a.repo)).reduce((a,b) => new Set([...a, ...b]), new Set()).size)),
          ['Repos with new pull requests'].concat(months.map(m => Object.values(nonBotContributors).map(c => c.filter(a => a.time.slice(0,7) === m && a.type === "pull_request").map(a => a.repo)).reduce((a,b) => new Set([...a, ...b]), new Set()).size)),
          ['Total repos'].concat(Array(months.length -1).fill(null)).concat([repos.length])
        ]
      },
      'popularRepos': {
        columns: [
          ['contributions'].concat(topRepos.map(repo => repoPerContributions[repo]['total'])),
          ['1'].concat(topRepos.map(repo => repoPerContributions[repo]['1'])),
          ['2-9'].concat(topRepos.map(repo => repoPerContributions[repo]['2-9'])),
          ['10-29'].concat(topRepos.map(repo => repoPerContributions[repo]['10-29'])),
          ['30-99'].concat(topRepos.map(repo => repoPerContributions[repo]['30-99'])),
          ['100+'].concat(topRepos.map(repo => repoPerContributions[repo]['100+']))
        ]
      },
      'contributionsPerContributors': {
        columns: [
          ['Number of contributors having made a number of contributions'].concat(contributionsPerContributors)
        ]
      }
    }

    // Processing for Sankey graph of contributors / repos
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
      return {name: node, id: node, contributors: [...contributors], repos: [...repos]};
    })

    graphs.distribution = {
      nodes,
      links
    };

    // Processing for recent contributions
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
    const topRecentCGRepos = Object.keys(repoPerRecentContributions).filter(n => !notCG(n)).sort((a,b) => repoPerRecentContributions[b].total - repoPerRecentContributions[a].total).slice(0,40);

    graphs.popularRecentRepos = {
      columns : [
        ['comments'].concat(topRecentRepos.map(repo => repoPerRecentContributions[repo].comment)),
        ['issues'].concat(topRecentRepos.map(repo => repoPerRecentContributions[repo].issue)),
        ['PRs'].concat(topRecentRepos.map(repo => repoPerRecentContributions[repo].pull_request))
      ]
    };
    graphs.__shareddata.topRecentRepos = topRecentRepos;

    graphs.popularRecentCGRepos = {
      columns : [
          ['comments'].concat(topRecentCGRepos.map(repo => repoPerRecentContributions[repo].comment)),
          ['issues'].concat(topRecentCGRepos.map(repo => repoPerRecentContributions[repo].issue)),
          ['PRs'].concat(topRecentCGRepos.map(repo => repoPerRecentContributions[repo].pull_request))
      ]
    };
    graphs.__shareddata.topRecentCGRepos = topRecentCGRepos;

    fs.writeFileSync('graphs.json', JSON.stringify(graphs));
  });
