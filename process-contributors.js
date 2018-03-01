const fs = require("fs");

const contributors = JSON.parse(fs.readFileSync(process.argv[2], 'utf-8'));

const isNotABot = n => !["chromium-wpt-export-bot", "moz-wptsync-bot", "GoogleCodeExporter", "wpt-pr-bot", "w3c-bots", "greenkeeper[bot]", "hoppipolla-critic-bot"].includes(n);

const now = new Date();
const monthAgo = n => { const d = new Date(); d.setMonth(now.getMonth() - n); return d;}

const pullRequestFilter = c => c.find(a => a.type === "pull_request");

const nonBotContributors = {};

Object.keys(contributors).filter(isNotABot).forEach(c => {
  nonBotContributors[c] = contributors[c].slice().sort((a,b) => a.time.localeCompare(b.time));
});

console.log("Total contributors: " + Object.keys(nonBotContributors).length);
console.log("Total PR contributors: " + Object.values(nonBotContributors).filter(pullRequestFilter).length);
const lastMonthFilter = a => a.time > monthAgo(1).toJSON();
const lastMonthContributors = Object.values(nonBotContributors).filter(c => c.find(lastMonthFilter));
console.log("Active contributors in the last month: " + lastMonthContributors.length);
console.log("Active PR contributors in the last month: " + lastMonthContributors.filter(pullRequestFilter).length);

console.log("First-time contributors in the past 6 months:");
for (let i = 0; i < 6; i++) {
  const month = (monthAgo(6 - i).toJSON()).slice(0,7);
  const firstTime = Object.keys(nonBotContributors).filter(c => nonBotContributors[c][0].time.slice(0,7) == month);
  console.log(month + ": " + firstTime.length + " incl " + firstTime.filter(c => pullRequestFilter(nonBotContributors[c])).length + " PRs (" + firstTime.join(", ") + ")");
}

console.log("Repos with first-time contributors last month:");
const lastMonth = (monthAgo(1).toJSON()).slice(0,7);
const firstTimers = Object.values(nonBotContributors).filter(c => lastMonthFilter(c[0]));
const firstTimeRepos = firstTimers.map(c => c[0].repo).reduce((a,b) => {if (!a[b]) { a[b] = 0 ;} a[b]++; return a;}, {});
console.log(JSON.stringify(firstTimeRepos));
console.log("Repos with first-time PR contributors last month:");
const firstPRRepos = firstTimers.filter(pullRequestFilter).map(c => c[0].repo).reduce((a,b) => {if (!a[b]) { a[b] = 0 ;} a[b]++; return a;}, {});
console.log(JSON.stringify(firstPRRepos));

console.log("10 most active contributors:");
console.log(Object.keys(nonBotContributors).map(c => { return {name: c, count: nonBotContributors[c].length};}).sort((a,b) => b.count - a.count).slice(0,10).map(o => o.name + " (" + o.count + ")").join(", "));
console.log("10 most active PR contributors:");
console.log(Object.keys(nonBotContributors).map(c => { return {name: c, count: nonBotContributors[c].filter(a => a.type === "pull_request").length};}).sort((a,b) => b.count - a.count).slice(0,10).map(o => o.name + " (" + o.count + ")").join(", "));

console.log("10 most active contributors in the last month:");
console.log(Object.keys(nonBotContributors).map(c => { return {name: c, count: nonBotContributors[c].filter(lastMonthFilter).length};}).sort((a,b) => b.count - a.count).slice(0,10).map(o => o.name + " (" + o.count + ")").join(", "));
console.log("10 most active PR contributors:");
console.log(Object.keys(nonBotContributors).map(c => { return {name: c, count: nonBotContributors[c].filter(lastMonthFilter).filter(a => a.type === "pull_request").length};}).sort((a,b) => b.count - a.count).slice(0,10).map(o => o.name + " (" + o.count + ")").join(", "));
