const emojis = {
  "+1": "👍",
  "-1": "👎",
  "laugh": "😄",
  "hooray": "🎉",
  "confused": "😕",
  "heart": "♥",
  "rocket": "🚀",
  "eyes": "👀"
};

const reactionLi = i => {
  const repo = i.href.split('/').slice(4,6).join('/');
  const li = document.createElement("li");
  li.appendChild(document.createTextNode(repo + ": "));
  const a = document.createElement("a");
  a.href = i.href;
  a.textContent = i.title;
  li.appendChild(a);
  li.appendChild(document.createTextNode(" (" + i.time.slice(0,10) + ")"));
  Object.keys(emojis).forEach(r => {
    if (i.reactions[r]) {
      li.appendChild(document.createTextNode(" " + i.reactions[r] + emojis[r] + " "));
    }
  });
  return li;
};

const recent = document.getElementById("recent");
const t = document.getElementById("top");
const negative = document.getElementById("negative");
fetch("reactions.json")
  .then(r => r.json())
  .then(issues => {
    issues.filter(i => i.state === "open").slice(0, 40)
      .forEach(i => {
        t.appendChild(reactionLi(i));
    });
    issues.sort((a,b) => -a.time.localeCompare(b.time)).slice(0, 20)
      .forEach(i => {
        recent.appendChild(reactionLi(i));
    });
    issues.sort((a,b) => -(a.reactions["-1"] + a.reactions["confused"]) + (b.reactions["-1"] + b.reactions["confused"])).slice(0, 40)
      .forEach(i => {
        negative.appendChild(reactionLi(i));
    });

  });
