This repo contains a set of node-based tools that allows to process dump of github activity logs (obtained via the github API) from a set of github repos and turn them into charts that visualize characteristics of the activity across these repos.

It was built to monitor activity across W3C github repositories - most of it should be reusable for other communities, but this tool is not easily re-usable yet.

The current process to generate the relevant data files is roughly as follow:
* fetch all the API result pages for github issues, comments, commit comments for each repo; we do this in W3C at the moment through a derivative of [backup-github.sh](https://gist.github.com/rodw/3073987)

* the first step of processing this data expects these data files to be named à la `foo-bar-(comments|issues|commit-comments)-20180904-171100.json` (although in practice it only cares about the type of data); assuming these files sit in `data/` directory, and assuming a `compiled/` directory exists to receive the process data, the command `node parse-data.js data compiled` will generate a set of json files files in `compiled`; right now, only `repos.json` and `contributors.json` are used in the following steps

* the second step turns these big data files on the specific data needed to build the graphs; the command `node prepare-graphs.js` run with the `contributors.json` and `repos.json` files present will generate a `graphs.json` data file

* that data file can then be visualized in a browser by loading `index.html` via `plot.js` (based on [c3.js](http://c3js.org/))

The files `bots.json` and `wg-repos.json` are W3C specific at the moment (although are unlikely to affect negatively usage in other communities). Likewise, part of `prepare-graphs.js` classifies repositories in a W3C specific way - the sole impact at the moment is that the last visualization is unlikely to be meaningful in other communities.