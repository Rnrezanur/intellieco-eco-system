const COLLECTION_CENTERS = [
  {
    id: "kuril-khilkhet-main",
    name: "Kuril-Khilkhet Waste Collection Center",
    area: "Kuril-Khilkhet",
    address: "Kuril-Khilkhet area, Dhaka",
    status: "Available",
    type: "mixed waste collection",
    lat: 23.8213,
    lon: 90.4216
  }
];

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function findCentersByArea(query) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return COLLECTION_CENTERS;
  }

  return COLLECTION_CENTERS.filter((center) => {
    const searchableText = [
      center.name,
      center.area,
      center.address,
      center.status,
      center.type
    ]
      .map(normalizeText)
      .join(" ");

    return normalizedQuery
      .split(/[\s,-]+/)
      .filter(Boolean)
      .some((part) => searchableText.includes(part));
  });
}

function getMapLocation(query, centers) {
  if (centers.length) {
    return {
      name: query || "All center locations",
      lat: centers[0].lat,
      lon: centers[0].lon
    };
  }

  return {
    name: query || "No area selected",
    lat: 23.8213,
    lon: 90.4216
  };
}

async function searchRecyclingCenters(req, res) {
  const query = String(req.query.query || "").trim();
  const showAll = req.query.all === "true";
  const centers = showAll ? COLLECTION_CENTERS : findCentersByArea(query);

  return res.json({
    cached: false,
    fallback: false,
    location: getMapLocation(query, centers),
    centers,
    message: centers.length ? "" : "No centers available in this area yet."
  });
}

module.exports = {
  searchRecyclingCenters
};
