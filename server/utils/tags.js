
function parseTagList(raw) {
  return (raw || "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

module.exports = { parseTagList };
