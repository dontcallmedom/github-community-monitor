const now = new Date();
const svg = d3.select("#responsiveness").append("svg").attr('height', 800).attr('width', 800);

const colors = d3.schemeCategory10;

const scope = (window.location.search || "").slice(1);

const wgId = parseInt(scope, 10) || 0;

const summary = ({fiveNums}) =>  `Min:  ${fiveNums[0]}, 1st Quartile: ${fiveNums[1]}, Median: ${fiveNums[2]}, 3rd Quartile: ${fiveNums[3]}, Max: ${fiveNums[4]}`;

const diffDate = (d1, d2) => {
  return Math.floor((d1.getTime() - d2.getTime())/(1000*60*60*24));
}

function computeFirstResponseTime(repos, issues) {
  let ret = [];

  for (let repo of repos) {
    if (!issues[repo.fullName]) continue;
    for (let issue of issues[repo.fullName]) {
      const firstResponse = issue.comments.find(c => c.user !== issue.user);
      const closure = issue.closed_at;
      const firstResponseTime = firstResponse ? new Date(firstResponse.time) : Infinity;
      const closureTime = closure ? new Date(closure) : Infinity;
      const firstReactionTime = new Date(Math.min(firstResponseTime, closureTime, now));
      ret.push(diffDate(firstReactionTime, new Date(issue.time)));
    }
  }
  return ret;
}

Promise.all([fetch("https://w3c.github.io/validate-repos/report.json").then(r => r.json()),
             fetch("issues.json").then(r => r.json())])
  .then(([repodata, issuedata]) => {
    const wgs = Object.values(repodata.groups).filter(g => g.type === "working group").filter(wg => wg.repos.some(r => r.hasRecTrack));
    let subjects = wgs.map(wg => Object.assign({}, {name: wg.name.replace(' Working Group', ''), href:"?" + wg.id}));
    let firstResponseTimes = wgs.map(
      wg => computeFirstResponseTime(wg.repos.filter(r => r.hasRecTrack), issuedata)
    );
    if (wgId) {
      const wg = wgs.find(wg => wg.id === wgId);
      document.querySelector("title").textContent = document.querySelector("title").textContent + ": " + wg.name;
      document.querySelector("h1").textContent = document.querySelector("h1").textContent + ": " + wg.name;
      subjects = wg.repos.filter(r => r.hasRecTrack).map(r => Object.assign({}, {name: r.fullName, href:"https://github.com/" + r.fullName}));
      firstResponseTimes = wg.repos.filter(r => r.hasRecTrack).map(r => computeFirstResponseTime([r], issuedata));
    }
    let stats = firstResponseTimes.map(x => d3.boxplotStats(x));
    console.log(stats);
    let x = d3.scaleLinear()
        .domain([0, 500])
        .range([0, 500]);
    let boxplot = d3.boxplot().scale(x).showInnerDots(false).symbol(d3.boxplotSymbolTick).opacity(1);
    const groupPlots = svg.selectAll('g.plot').data(stats)
      .join('g')
          .attr('transform', (_, i) => 'translate(0, ' + (i*25 + 10) + ')');
    groupPlots
          .append("title").text((_, i) => subjects[i].name + ": "  + summary(stats[i]));


    groupPlots.append('a')
      .attr("xlink:href", (_, i) => subjects[i].href)
      .append("text")
      .text((_, i) => subjects[i].name);

    groupPlots.append('g')
      .attr('transform', 'translate(250, -15)')
      .attr('color', (_, i) => colors[i % 10])
      .call(boxplot);
  });

