
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
loading.textContent = "Loading data...";
body.appendChild(loading);
body.setAttribute("aria-busy", true);

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
                    "popularRecentRepos": {title: "Contributions received in the past 6 months in the most recently popular repositories"},
                    "popularRecentCGRepos": {title: "Contributions received in the past 6 months in the most recently popular CG repositories"}
                   };

fetch('graphs.json').then(r => r.json())
  .then(chartdata => {
    loading.remove();
    body.setAttribute("aria-busy", false);

    Object.keys(charts).forEach((id, i) => {
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


    const buildTimeseries = (id, colors, data) => {
      return {
        bindto: id,
        data: {
          x: 'x',
          xFormat: '%Y-%m',
          columns:
          [['x'].concat(chartdata.__shareddata.months), ...data]
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
                      chartdata.contributions.columns
                     ));
    c3.generate(
      buildTimeseries('#prs',
                      getColors(['pull_request']),
                      chartdata.prs.columns
                     ));
    c3.generate(
      buildTimeseries('#contributors',
                      getColors(['neutral', 'pull_request']),
                      chartdata.contributors.columns
                     ));
    c3.generate(
      buildTimeseries('#monthcontributors',
                      getColors(['neutral', 'pull_request']),
                      chartdata.monthcontributors.columns
                     ));
    c3.generate(
      buildTimeseries('#first',
                      getColors(['neutral', 'pull_request']),
                      chartdata.first.columns
                     ));
    c3.generate(
      buildTimeseries('#repos',
                      getColors(['neutral', 'pull_request'], ['black']),
                      chartdata.repos.columns
                     ));
    const dist = d3.select("#distribution").append("svg").attr('height', 1200).chart("Sankey");
    const nodes = chartdata.distribution.nodes;
    const links = chartdata.distribution.links;
    dist.colorLinks(link => patterns[link.type])
      .nodeWidth(24)
      .draw({nodes: nodes,
             links});
    // adjust the width of boxes based on the number of targets / sources
    d3.select("#distribution").selectAll('*[data-node-id] rect')
      .attr('width', node => {
        const n = nodes.find(n => n.name === node.name);
        if (n.contributors.length) {
          return n.contributors.length;
        } else if (n.repos.length) {
          return n.repos.length;
        }
      })
      .attr('x', function(node) {
        const n = nodes.find(n => n.name === node.name);
        if (n.repos.length) {
          return this.x.baseVal.value + (24 - n.repos.length);
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
          return `${node.name} has received ${prs + issues + comments} contributions (${prs} PRs, ${issues} issues, ${comments} comments) from ${contributors.length} contributors (${contributors.join(', ')})`;
        } else if (node.sourceLinks.length) {
          const prs = node.sourceLinks.filter(link => link.type === "pull_request").reduce((total, link) => total + link.value, 0);
          const issues = node.sourceLinks.filter(link => link.type === "issue").reduce((total, link) => total + link.value, 0);
          const comments = node.sourceLinks.filter(link => link.type === "comment").reduce((total, link) => total + link.value, 0);
          const repos = n.repos;
          return `${node.name} has made ${prs + issues + comments} contributions (${prs} PRs, ${issues} issues, ${comments} comments) to ${repos.length} repos (${repos.join(', ')})`;
        }
      });

    c3.generate({
      bindto: "#popularRepos",
      data: {
        columns: chartdata.popularRepos.columns,
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
          categories: chartdata.__shareddata.topRepos
        },
        y2: { show: true}
      }
    });
    c3.generate({
      bindto: "#contributionsPerContributors",
      data: {
        columns: chartdata.contributionsPerContributors.columns,
        type: 'bar'
      },
      color: getColors(['neutral']),
      axis: {
        x: { tick: { format: x => x === 50 ? "50+" : x}}
      }
    });

    c3.generate({
      bindto: "#popularRecentRepos",
      data: {
        columns: chartdata.popularRecentRepos.columns,
        type: 'bar',
        groups: [['comments', 'issues', 'PRs']]
      },
      color: getColors(['comment', 'issue', 'pull_request']),
      axis: {
        x: {
          type: 'category',
          categories: chartdata.__shareddata.topRecentRepos
        }
      }
    });

    d3.selectAll('#popularRecentRepos .c3-axis-x .tick text, #popularRepos .c3-axis-x .tick text')
      .each (function (d) {
        const self = d3.select(this);
        const tspans = self.html();
        const text = self.text();
        self.html("<a xlink:href='https://github.com/" + text + "'>" + tspans +"</a>");
      });

    c3.generate({
      bindto: "#popularRecentCGRepos",
      data: {
        columns: chartdata.popularRecentCGRepos.columns,
        type: 'bar',
        groups: [['comments', 'issues', 'PRs']]
      },
      color: getColors(['comment', 'issue', 'pull_request']),
      axis: {
        x: {
          type: 'category',
          categories: chartdata.__sharedata.topRecentCGRepos
        }
      }
    });
  }).catch(console.error.bind(console));
