const isNotABot = n => !["chromium-wpt-export-bot", "moz-wptsync-bot", "GoogleCodeExporter", "wpt-pr-bot", "w3c-bots", "greenkeeper[bot]", "hoppipolla-critic-bot"].includes(n);

Promise.all(['contributors.json', 'repos.json'].map(p => fetch(p).then(r => r.json())))
  .then(([contributors,repos]) => {
    const nonBotContributors = {};

    Object.keys(contributors).filter(isNotABot).forEach(c => {
      nonBotContributors[c] = contributors[c].slice().sort((a,b) => a.time.localeCompare(b.time));
    });

    const charts = ["contributions", "prs", "contributors", "monthcontributors", "first", "repos", "contributionsPerContributors", "popularRepos", "popularRecentRepos"];
    charts.forEach(id => {
      const div = document.createElement("div");
      div.id = id;
      document.querySelector('body').appendChild(div);
    });
    const months = [...new Set(Object.values(nonBotContributors).map(c => c.map(a => a.time.slice(0,7))).reduce((a,b) => a.concat(b), []))].sort();

    const buildTimeseries = (id, ...data) => {
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
                      ['Contributions'].concat(months.map(m => Object.values(nonBotContributors).map(c => c.filter(a => a.time.slice(0,7) === m).length).reduce((a,b) => a + b, 0))))
    );
    c3.generate(
        buildTimeseries('#prs',
                        ['Pull Requests'].concat(months.map(m => Object.values(nonBotContributors).map(c => c.filter(a => a.time.slice(0,7) === m && a.type === "pull_request").length).reduce((a,b) => a + b, 0)))
                       ));
    c3.generate(
        buildTimeseries('#contributors',
                        ['Contributors (ever)'].concat(months.map(m => Object.values(nonBotContributors).filter(c => c.find(a => a.time.slice(0,7) <= m)).length)),
                        ['PR Contributors'].concat(months.map(m => Object.values(nonBotContributors).filter(c => c.find(a => a.time.slice(0,7) <= m && a.type === "pull_request")).length))
                       ));

    c3.generate(
        buildTimeseries('#monthcontributors',
                        ['Contributors (during that month)'].concat(months.map(m => Object.values(nonBotContributors).filter(c => c.find(a => a.time.slice(0,7) === m)).length)),
                        ['PR Contributors'].concat(months.map(m => Object.values(nonBotContributors).filter(c => c.find(a => a.time.slice(0,7) === m && a.type === "pull_request")).length))
                       ));
    c3.generate(
        buildTimeseries('#first',
                        ['First-time contributors'].concat(months.map(m => Object.values(nonBotContributors).filter(c => c[0].time.slice(0,7) === m).length)),
                        ['First-time PR contributors'].concat(months.map(m => Object.values(nonBotContributors).filter(c => (c.find(a => a.type==="pull_request") || {time: ''}).time.slice(0,7) === m).length))
                       ));
    c3.generate(
        buildTimeseries('#repos',
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
                    acc[contributions]++;
                    return acc;
                  }, Array(Math.max(...contributorsPerRepo.map(contributor => Object.keys(contributor).reduce((a,b) => a + contributor[b], 0)))).fill(0));

    const topRepos = Object.keys(repoPerContributions).sort((a,b) => repoPerContributions[b].total - repoPerContributions[a].total).slice(0,40);

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
        groups: [['1', '2-9', '10-29', '30-99', '100+']]
      },
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
      }
    });


    const now = new Date();
    const monthAgo = n => { const d = new Date(); d.setMonth(now.getMonth() - n); return d;}
    const recentActivity = a => a.time > monthAgo(6).toJSON();

    const recentContributorsPerRepo = Object.keys(nonBotContributors).map(contributor => nonBotContributors[contributor].filter(recentActivity).map(a => a.repo).reduce((acc, repo) => { if (!acc[repo]) acc[repo] = 0; acc[repo]++; return acc;}, {}));
    const repoPerRecentContributions = recentContributorsPerRepo
          .reduce((acc, contributor) =>
                  {
                    Object.keys(contributor)
                      .forEach(repo => {
                        if (!acc[repo]) {
                          acc[repo] = 0;
                        }
                        acc[repo] += contributor[repo];
                      });
                    return acc;
                  }, {});
    const topRecentRepos = Object.keys(repoPerRecentContributions).sort((a,b) => repoPerRecentContributions[b] - repoPerRecentContributions[a]).slice(0,40);

    c3.generate({
      bindto: "#popularRecentRepos",
      data: {
        columns: [
          ['Contributions in the past 6 months'].concat(topRecentRepos.map(repo => repoPerRecentContributions[repo]))
        ],
        type: 'bar',
      },
      axis: {
        x: {
          type: 'category',
          categories: topRecentRepos
        }
      }
    });
  });
