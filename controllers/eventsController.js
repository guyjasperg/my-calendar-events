function getColor(colorId) {
  const colors = {
    1: "#a4bdfc",
    2: "#88b253",
    3: "#832da4",
    4: "#d88177",
    5: "#fbd75b",
    6: "#e25d32",
    7: "#46d6db",
    8: "#e1e1e1",
    9: "#5484ed",
    10: "#51b749",
    11: "#c3291c",
  };
  return colors[colorId] || "#ffffff"; // Default to white if colorId is not found
}

module.exports = {
  getColor,
};
