const ol = document.querySelector("ol");
fetch("first-contributors.json")
  .then(r => r.json())
  .then(({since,contributors}) => {
    Object.keys(contributors).forEach(c => {
      const contrib = contributors[c];
      const li = document.createElement("li");
      li.appendChild(document.createTextNode(c + ": "));
      const a = document.createElement("a");
      a.href = contrib.link;
      a.textContent = contrib.type + " on " + contrib.repo;
      li.appendChild(a);
      li.appendChild(document.createTextNode(" - " + contrib.time));
      ol.appendChild(li);
    });
  });
