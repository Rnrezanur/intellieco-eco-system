const SUGGESTIONS = {
  plastic: "Place it in the plastic recycling bin after rinsing it.",
  metal: "Put it in a metal recycling bin or local scrap collection point.",
  paper: "Keep it dry and place it in the paper recycling bin.",
  organic: "Add it to a compost bin if possible.",
  glass: "Take it to a glass recycling container and avoid breaking it.",
  unknown: "Check your local rules before disposing of this item."
};

function formatWasteType(label = "") {
  const normalized = String(label).trim().toLowerCase();
  if (!normalized) {
    return "Unknown";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getSuggestionForLabel(label = "") {
  const normalized = String(label).trim().toLowerCase();
  return SUGGESTIONS[normalized] || SUGGESTIONS.unknown;
}

module.exports = {
  formatWasteType,
  getSuggestionForLabel,
  SUGGESTIONS
};
