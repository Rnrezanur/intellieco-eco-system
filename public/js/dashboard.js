const detectionForm = document.getElementById("detectionForm");
const wasteImageInput = document.getElementById("wasteImage");
const previewImage = document.getElementById("previewImage");
const modelStatus = document.getElementById("modelStatus");
const resultCard = document.getElementById("resultCard");
const analyzeBtn = document.getElementById("analyzeBtn");
const historyBody = document.getElementById("historyBody");
const cameraFeed = document.getElementById("cameraFeed");
const snapshotCanvas = document.getElementById("snapshotCanvas");
const startCameraBtn = document.getElementById("startCameraBtn");
const takeSnapshotBtn = document.getElementById("takeSnapshotBtn");
const totalDetectionsPill = document.getElementById("totalDetectionsPill");
const locationForm = document.getElementById("locationForm");
const locationInput = document.getElementById("locationInput");
const mapStatus = document.getElementById("mapStatus");
const recyclingList = document.getElementById("recyclingList");
const finderResults = document.getElementById("finderResults");
const showAllCentersBtn = document.getElementById("showAllCentersBtn");
const finderPreviewBtn = document.getElementById("finderPreviewBtn");
const centerCountLabel = document.getElementById("centerCountLabel");
const centersModal = document.getElementById("centersModal");
const centersModalBackdrop = document.getElementById("centersModalBackdrop");
const closeCentersModalBtn = document.getElementById("closeCentersModalBtn");
const modelModeBadge = document.getElementById("modelModeBadge");
const modelFallbackText = document.getElementById("modelFallbackText");
const pickupRequestForm = document.getElementById("pickupRequestForm");
const pickupStatus = document.getElementById("pickupStatus");
const pickupHistoryBody = document.getElementById("pickupHistoryBody");
const pickupImageInput = document.getElementById("pickupImage");
const pickupWeightInput = document.getElementById("pickupWeight");
const pickupWasteTypeInput = document.getElementById("pickupWasteType");
const previousDetectionSelect = document.getElementById("previousDetectionSelect");
const pickupDetectedItemsPreview = document.getElementById("pickupDetectedItemsPreview");
const openDetectionHistoryModalBtn = document.getElementById("openDetectionHistoryModalBtn");
const detectionHistoryModal = document.getElementById("detectionHistoryModal");
const historyModalSearch = document.getElementById("historyModalSearch");
const historyWasteFilter = document.getElementById("historyWasteFilter");
const applyHistorySelectionBtn = document.getElementById("applyHistorySelectionBtn");
const rewardPointsTotal = document.getElementById("rewardPointsTotal");
const rewardedPickupTotal = document.getElementById("rewardedPickupTotal");

let wasteModel = null;
let currentImageBlob = null;
let currentStream = null;
let wasteBreakdownChart = null;
let wasteTrendChart = null;
let map = null;
let mapMarkers = [];
let allCentersMap = null;
let allCentersMarkers = [];
let usingDemoModel = false;
let demoClassifierModel = null;
let selectedPreviousDetections = [];
const FALLBACK_MODEL_VERSION = "mobilenet-v2-fallback";

const DEMO_WASTE_RULES = [
  { keywords: ["bottle", "plastic", "pet", "poly", "wrapper", "water bottle", "pop bottle"], label: "plastic", confidence: 0.72 },
  { keywords: ["can", "metal", "aluminum", "aluminium", "tin", "steel", "scrap", "iron"], label: "metal", confidence: 0.72 },
  { keywords: ["paper", "book", "cardboard", "newspaper", "carton", "envelope", "comic book"], label: "paper", confidence: 0.72 },
  { keywords: ["banana", "food", "leaf", "organic", "vegetable", "fruit", "orange", "apple"], label: "organic", confidence: 0.72 },
  { keywords: ["glass", "jar", "wine bottle", "beer bottle"], label: "glass", confidence: 0.72 }
];

function setMapStatus(message) {
  if (mapStatus) {
    mapStatus.textContent = message;
  }
}

function withTimeout(promise, timeoutMs, timeoutMessage) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    })
  ]);
}

function loadImageFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const imageElement = new Image();
    const objectUrl = URL.createObjectURL(blob);

    imageElement.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(imageElement);
    };

    imageElement.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not load the selected image."));
    };

    imageElement.src = objectUrl;
  });
}

function renderResult(result) {
  resultCard.classList.remove("empty");
  const modelWarning = result.predictedLabel === "unknown"
    ? `<p class="status-text"><strong>Note:</strong> The fallback AI model could not identify this waste confidently. A custom trained waste model will improve accuracy.</p>`
    : "";

  resultCard.innerHTML = `
    <span class="badge">${result.wasteType}</span>
    <p><strong>Model Label:</strong> ${result.predictedLabel}</p>
    <p><strong>Model Version:</strong> ${result.modelVersion}</p>
    <img src="${result.imagePath}" alt="${result.wasteType}" class="preview-image" />
    <p><strong>Confidence:</strong> ${
      result.confidence ? `${(result.confidence * 100).toFixed(1)}%` : "Not available"
    }</p>
    <p><strong>Recycling Suggestion:</strong> ${result.suggestion}</p>
    ${modelWarning}
  `;
}

function updateModelUi(mode) {
  if (!modelModeBadge || !modelFallbackText) {
    return;
  }

  if (mode === "demo") {
    modelModeBadge.textContent = "Demo Mode";
    modelModeBadge.dataset.mode = "demo";
    modelFallbackText.textContent = "Enabled";
    return;
  }

  modelModeBadge.textContent = "Custom Model";
  modelModeBadge.dataset.mode = "custom";
  modelFallbackText.textContent = "Disabled";
}

function prependHistoryRow(item) {
  const emptyRow = historyBody.querySelector("td[colspan='6']");
  if (emptyRow) {
    emptyRow.parentElement.remove();
  }

  const row = document.createElement("tr");
  row.innerHTML = `
    <td><img src="${item.imagePath}" alt="${item.wasteType}" class="history-thumb" /></td>
    <td>${item.wasteType}</td>
    <td>${item.modelVersion || "1.0.0"}</td>
    <td>${item.confidence ? `${(item.confidence * 100).toFixed(1)}%` : "N/A"}</td>
    <td>${item.suggestion}</td>
    <td>${new Date().toLocaleString()}</td>
  `;

  historyBody.prepend(row);
}

function loadPreviewFromBlob(blob) {
  const objectUrl = URL.createObjectURL(blob);
  previewImage.src = objectUrl;
  previewImage.classList.remove("hidden");
}

async function bootModel() {
  const { modelUrl, metadataUrl } = window.intelliEcoModelConfig || {};

  if (!modelUrl || !metadataUrl) {
    usingDemoModel = true;
    updateModelUi("demo");
    modelStatus.textContent = "MobileNet AI";
    return;
  }

  try {
    modelStatus.textContent = "Loading custom waste model...";
    wasteModel = await tmImage.load(modelUrl, metadataUrl);
    usingDemoModel = false;
    updateModelUi("custom");
    modelStatus.textContent = "Custom waste model is ready.";
  } catch (error) {
    console.error(error);
    wasteModel = null;
    usingDemoModel = true;
    updateModelUi("demo");
    modelStatus.textContent = "MobileNet AI";
  }
}

function guessWasteFromFilename(file) {
  const source = String(file?.name || "").toLowerCase();
  return mapTextToWastePrediction(source);
}

function mapTextToWastePrediction(sourceText) {
  const source = String(sourceText || "").toLowerCase();
  const matchedRule = DEMO_WASTE_RULES.find((rule) =>
    rule.keywords.some((keyword) => source.includes(keyword))
  );

  if (matchedRule) {
    return {
      className: matchedRule.label,
      probability: matchedRule.confidence
    };
  }

  // Demo mode cannot inspect image pixels, so unknown is safer than a fake confident result.
  return {
    className: "unknown",
    probability: 0
  };
}

function predictWithQuickImageHeuristic(imageElement) {
  const canvas = document.createElement("canvas");
  const size = 96;
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return { className: "unknown", probability: 0 };
  }

  context.drawImage(imageElement, 0, 0, size, size);
  const { data } = context.getImageData(0, 0, size, size);
  let bluePixels = 0;
  let veryBrightPixels = 0;
  let lowSaturationBrightPixels = 0;

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);

    if (blue > 125 && blue > red + 28 && blue > green + 8) {
      bluePixels += 1;
    }

    if (red > 220 && green > 220 && blue > 220) {
      veryBrightPixels += 1;
    }

    if (max > 175 && max - min < 42) {
      lowSaturationBrightPixels += 1;
    }
  }

  const totalPixels = size * size;
  const blueRatio = bluePixels / totalPixels;
  const brightRatio = veryBrightPixels / totalPixels;
  const transparentLikeRatio = lowSaturationBrightPixels / totalPixels;

  if (blueRatio > 0.002 && brightRatio > 0.28 && transparentLikeRatio > 0.38) {
    return {
      className: "plastic",
      probability: 0.76
    };
  }

  return {
    className: "unknown",
    probability: 0
  };
}

async function loadDemoClassifier() {
  if (demoClassifierModel || typeof mobilenet === "undefined") {
    return demoClassifierModel;
  }

  demoClassifierModel = await withTimeout(
    mobilenet.load(),
    12000,
    "Demo image classifier took too long to load."
  );
  return demoClassifierModel;
}

async function predictWithDemoFallback(imageElement, file) {
  const filenamePrediction = guessWasteFromFilename(file);
  if (filenamePrediction.className !== "unknown") {
    return filenamePrediction;
  }

  const quickImagePrediction = predictWithQuickImageHeuristic(imageElement);
  if (quickImagePrediction.className !== "unknown") {
    return quickImagePrediction;
  }

  try {
    const classifier = await loadDemoClassifier();
    if (!classifier) {
      return filenamePrediction;
    }

    const predictions = await withTimeout(
      classifier.classify(imageElement),
      10000,
      "Demo image classifier took too long to analyze this image."
    );
    const bestPrediction = predictions[0];
    const combinedLabels = predictions.map((prediction) => prediction.className).join(" ");
    const mappedPrediction = mapTextToWastePrediction(combinedLabels);

    if (mappedPrediction.className === "unknown") {
      return filenamePrediction;
    }

    return {
      className: mappedPrediction.className,
      probability: bestPrediction?.probability || mappedPrediction.probability
    };
  } catch (error) {
    console.error(error);
    return filenamePrediction;
  }
}

async function fetchStats() {
  try {
    const response = await fetch("/api/stats/user");
    const stats = await response.json();

    if (!response.ok) {
      throw new Error(stats.message || "Could not load chart data.");
    }

    totalDetectionsPill.textContent = `${stats.totalDetections} total scans`;
    renderWasteBreakdownChart(stats.wasteBreakdown);
    renderWasteTrendChart(stats.dailyTrend);
  } catch (error) {
    console.error(error);
  }
}

function renderWasteBreakdownChart(entries) {
  const context = document.getElementById("wasteBreakdownChart");
  if (!context) {
    return;
  }

  if (wasteBreakdownChart) {
    wasteBreakdownChart.destroy();
  }

  wasteBreakdownChart = new Chart(context, {
    type: "doughnut",
    data: {
      labels: entries.map((entry) => entry._id),
      datasets: [
        {
          data: entries.map((entry) => entry.total),
          backgroundColor: ["#2f8f5b", "#4db08a", "#7dc98e", "#f4b860", "#5db2d6", "#d6dde1"]
        }
      ]
    },
    options: {
      plugins: {
        legend: {
          position: "bottom"
        }
      }
    }
  });
}

function renderWasteTrendChart(entries) {
  const context = document.getElementById("wasteTrendChart");
  if (!context) {
    return;
  }

  if (wasteTrendChart) {
    wasteTrendChart.destroy();
  }

  wasteTrendChart = new Chart(context, {
    type: "line",
    data: {
      labels: entries.map((entry) => entry._id),
      datasets: [
        {
          label: "Detections",
          data: entries.map((entry) => entry.total),
          borderColor: "#236c44",
          backgroundColor: "rgba(47, 143, 91, 0.18)",
          fill: true,
          tension: 0.35
        }
      ]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        }
      }
    }
  });
}

function ensureMap() {
  if (map) {
    return;
  }

  if (typeof L === "undefined") {
    setMapStatus("Map library could not load right now.");
    return;
  }

  map = L.map("recyclingMap").setView([23.8103, 90.4125], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);
}

function ensureAllCentersMap() {
  if (allCentersMap) {
    return;
  }

  if (typeof L === "undefined") {
    setMapStatus("Map library could not load right now.");
    return;
  }

  allCentersMap = L.map("allCentersMap").setView([23.8213, 90.4216], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(allCentersMap);
}

function getCenterMarkerIcon() {
  if (typeof L === "undefined") {
    return undefined;
  }

  return L.divIcon({
    className: "center-marker-icon",
    html: "<span></span>",
    iconSize: [34, 42],
    iconAnchor: [17, 42],
    popupAnchor: [0, -36]
  });
}

function renderCentersOnMap(targetMap, markers, centers) {
  markers.forEach((marker) => marker.remove());
  const nextMarkers = [];
  const markerIcon = getCenterMarkerIcon();
  const markerOptions = markerIcon ? { icon: markerIcon } : {};

  centers.forEach((location) => {
    const marker = L.marker([location.lat, location.lon], markerOptions)
      .addTo(targetMap)
      .bindPopup(
        `<strong>${location.name}</strong><br/>Area: ${location.area}<br/>Status: ${
          location.status || "Available"
        }<br/>${location.address || "Dhaka, Bangladesh"}`
      );
    nextMarkers.push(marker);
  });

  if (centers.length) {
    const bounds = L.latLngBounds(centers.map((center) => [center.lat, center.lon]));
    targetMap.fitBounds(bounds, { padding: [28, 28], maxZoom: 15 });
    nextMarkers[0]?.openPopup();
  }

  return nextMarkers;
}

async function fetchCenters(placeName = "", showAll = false) {
  const params = new URLSearchParams();
  if (placeName) {
    params.set("query", placeName);
  }
  if (showAll) {
    params.set("all", "true");
  }

  const response = await fetch(`/api/recycling-centers?${params.toString()}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Location search failed.");
  }

  return data;
}

async function openCentersModal() {
  if (!centersModal) {
    return;
  }

  centersModal.classList.remove("hidden");
  centersModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  closeCentersModalBtn?.focus({ preventScroll: true });
  ensureAllCentersMap();

  if (!allCentersMap) {
    return;
  }

  setTimeout(() => allCentersMap?.invalidateSize(), 80);

  try {
    const data = await fetchCenters("", true);
    allCentersMarkers = renderCentersOnMap(allCentersMap, allCentersMarkers, data.centers);
  } catch (error) {
    console.error(error);
  }
}

function closeCentersModal() {
  if (!centersModal) {
    return;
  }

  centersModal.classList.add("hidden");
  centersModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function updateRecyclingList(locations) {
  if (centerCountLabel) {
    centerCountLabel.textContent = `${locations.length}`;
  }

  if (!locations.length) {
    recyclingList.innerHTML = `
      <div class="recycling-card recycling-card-tip">
        <h3>No centers available in this area yet.</h3>
        <p>Try Kuril or Khilkhet, or use See All Center Locations.</p>
      </div>
    `;
    return;
  }

  recyclingList.innerHTML = locations
    .map(
      (location) => `
        <button type="button" class="recycling-card center-card" data-lat="${location.lat}" data-lon="${location.lon}">
          <div class="recycling-card-head">
            <h3>${location.name}</h3>
            <span class="mini-badge">${location.status || "Available"}</span>
          </div>
          <p><strong>Area:</strong> ${location.area || "Not specified"}</p>
          <p>${location.address || "Address not provided"}</p>
          <p><strong>Type:</strong> ${location.type || "collection center"}</p>
        </button>
      `
    )
    .join("");

  document.querySelectorAll(".center-card").forEach((card) => {
    card.addEventListener("click", () => {
      const lat = Number(card.dataset.lat);
      const lon = Number(card.dataset.lon);
      if (!map || Number.isNaN(lat) || Number.isNaN(lon)) {
        return;
      }

      map.setView([lat, lon], 15);
    });
  });
}

function prependPickupRow(pickup) {
  const emptyRow = pickupHistoryBody.querySelector("td[colspan='10']");
  if (emptyRow) {
    emptyRow.parentElement.remove();
  }

  const itemSummary = (pickup.detectedItems || [])
    .map((item) => `${item.wasteType} x${item.quantity}`)
    .join(", ");
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${pickup.wasteType}</td>
    <td>${pickup.imagePath ? `<img src="${pickup.imagePath}" alt="${pickup.wasteType}" class="history-thumb" />` : "No image"}</td>
    <td>${pickup.approximateWeightKg || "N/A"} kg</td>
    <td>${itemSummary || "N/A"}</td>
    <td>${pickup.areaName}</td>
    <td>${pickup.contactPhone}</td>
    <td>${pickup.status}</td>
    <td>${pickup.rewardStatus === "earned" ? `${pickup.rewardPoints} pts` : "Pending"}</td>
    <td>${pickup.assignedTo || "Not assigned"}</td>
    <td>${new Date(pickup.createdAt || Date.now()).toLocaleString()}</td>
  `;
  pickupHistoryBody.prepend(row);
}

function setPickupDetectedItems(items) {
  if (!pickupDetectedItemsPreview) {
    return;
  }

  if (!items.length) {
    pickupDetectedItemsPreview.classList.add("hidden");
    pickupDetectedItemsPreview.innerHTML = "";
    return;
  }

  pickupDetectedItemsPreview.classList.remove("hidden");
  pickupDetectedItemsPreview.innerHTML = `
    <strong>Detected items</strong>
    <div class="detected-item-list">
      ${items
        .map((item) => `<span class="mini-badge">${item.wasteType} x${item.quantity}</span>`)
        .join("")}
    </div>
  `;
}

function groupDetectionsAsItems(detections) {
  const itemMap = new Map();

  detections.forEach((detection) => {
    const wasteType = detection.wasteType || "Unknown";
    itemMap.set(wasteType, (itemMap.get(wasteType) || 0) + 1);
  });

  return Array.from(itemMap.entries()).map(([wasteType, quantity]) => ({
    wasteType,
    quantity
  }));
}

function syncPickupFromSelectedDetections() {
  const items = groupDetectionsAsItems(selectedPreviousDetections);

  if (selectedPreviousDetections.length === 1) {
    pickupWasteTypeInput.value = selectedPreviousDetections[0].wasteType || "";
  } else if (selectedPreviousDetections.length > 1) {
    pickupWasteTypeInput.value = "Mixed Waste";
  } else {
    pickupWasteTypeInput.value = "";
  }

  setPickupDetectedItems(items);
}

function openDetectionHistoryModal() {
  if (!detectionHistoryModal) {
    return;
  }

  detectionHistoryModal.classList.remove("hidden");
  detectionHistoryModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  historyModalSearch?.focus();
}

function closeDetectionHistoryModal() {
  if (!detectionHistoryModal) {
    return;
  }

  detectionHistoryModal.classList.add("hidden");
  detectionHistoryModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function filterDetectionHistoryModal() {
  if (!detectionHistoryModal) {
    return;
  }

  const searchValue = historyModalSearch?.value.trim().toLowerCase() || "";
  const wasteFilter = historyWasteFilter?.value || "";

  detectionHistoryModal.querySelectorAll(".history-modal-row").forEach((row) => {
    const matchesSearch = !searchValue || row.dataset.search?.includes(searchValue);
    const matchesWaste = !wasteFilter || row.dataset.waste === wasteFilter;
    row.classList.toggle("hidden", !(matchesSearch && matchesWaste));
  });
}

async function predictWasteFromBlob(blob) {
  const imageElement = await withTimeout(
    loadImageFromBlob(blob),
    8000,
    "The selected image took too long to load."
  );

  if (wasteModel) {
    const predictions = await withTimeout(
      wasteModel.predict(imageElement),
      10000,
      "The custom model took too long to analyze this image."
    );
    return predictions.sort((left, right) => right.probability - left.probability)[0];
  }

  return predictWithDemoFallback(imageElement, blob);
}

async function saveDetectionFromBlob(blob, filename = "waste-image.jpg") {
  const bestPrediction = await predictWasteFromBlob(blob);
  if (!bestPrediction) {
    throw new Error("The waste model did not return a prediction.");
  }

  const formData = new FormData();
  formData.append("wasteImage", blob, filename);
  formData.append("predictedLabel", bestPrediction.className);
  formData.append("confidence", bestPrediction.probability);
  formData.append(
    "modelVersion",
    usingDemoModel ? FALLBACK_MODEL_VERSION : window.intelliEcoModelConfig?.version || "1.0.0"
  );

  const response = await fetch("/api/detections/analyze", {
    method: "POST",
    body: formData
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Analysis failed.");
  }

  return result;
}

async function searchRecyclingCenters(placeName, showAll = false) {
  if (!placeName && !showAll) {
    setMapStatus("Enter an area name first.");
    finderResults?.classList.add("hidden");
    return;
  }

  finderResults?.classList.remove("hidden");
  ensureMap();
  if (!map) {
    finderResults?.classList.add("hidden");
    return;
  }

  setMapStatus(showAll ? "Loading all center locations..." : "Searching center locations...");

  try {
    const data = await fetchCenters(placeName, showAll);
    mapMarkers = renderCentersOnMap(map, mapMarkers, data.centers);

    updateRecyclingList(data.centers);
    if (data.centers.length) {
      setMapStatus(
        showAll
          ? `${data.centers.length} center location${data.centers.length === 1 ? "" : "s"} available.`
          : `${data.centers.length} center${data.centers.length === 1 ? "" : "s"} found for ${placeName}.`
      );
    } else {
      map.setView([data.location.lat, data.location.lon], 13);
      setMapStatus(data.message || "No centers available in this area yet.");
    }
    setTimeout(() => map?.invalidateSize(), 0);
  } catch (error) {
    console.error(error);
    finderResults?.classList.add("hidden");
    setMapStatus(error.message || "Could not load center locations right now.");
    recyclingList.innerHTML = "";
  }
}

wasteImageInput.addEventListener("change", () => {
  const file = wasteImageInput.files[0];
  if (!file) {
    return;
  }

  currentImageBlob = file;
  loadPreviewFromBlob(file);
});

startCameraBtn.addEventListener("click", async () => {
  try {
    currentStream = await navigator.mediaDevices.getUserMedia({ video: true });
    cameraFeed.srcObject = currentStream;
    cameraFeed.classList.remove("hidden");
    takeSnapshotBtn.disabled = false;
  } catch (error) {
    console.error(error);
    modelStatus.textContent = "Camera access failed. Please use file upload instead.";
  }
});

takeSnapshotBtn.addEventListener("click", () => {
  if (!currentStream) {
    return;
  }

  snapshotCanvas.width = cameraFeed.videoWidth;
  snapshotCanvas.height = cameraFeed.videoHeight;
  const context = snapshotCanvas.getContext("2d");
  context.drawImage(cameraFeed, 0, 0, snapshotCanvas.width, snapshotCanvas.height);

  snapshotCanvas.toBlob((blob) => {
    currentImageBlob = blob;
    loadPreviewFromBlob(blob);
  }, "image/jpeg");

  currentStream.getTracks().forEach((track) => track.stop());
  cameraFeed.classList.add("hidden");
  takeSnapshotBtn.disabled = true;
});

detectionForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentImageBlob) {
    modelStatus.textContent = "Please upload or capture an image first.";
    return;
  }

  analyzeBtn.disabled = true;
  modelStatus.textContent = usingDemoModel
    ? "Analyzing with MobileNet AI fallback..."
    : "Analyzing image with custom model...";

  try {
    const imageElement = await withTimeout(
      loadImageFromBlob(currentImageBlob),
      8000,
      "The selected image took too long to load."
    );
    let bestPrediction;

    if (wasteModel) {
      const predictions = await withTimeout(
        wasteModel.predict(imageElement),
        10000,
        "The custom model took too long to analyze this image."
      );
      bestPrediction = predictions.sort((left, right) => right.probability - left.probability)[0];
    } else {
      bestPrediction = await predictWithDemoFallback(imageElement, currentImageBlob);
    }

    if (!bestPrediction) {
      throw new Error("The waste model did not return a prediction.");
    }

    const formData = new FormData();
    formData.append("wasteImage", currentImageBlob, "waste-image.jpg");
    formData.append("predictedLabel", bestPrediction.className);
    formData.append("confidence", bestPrediction.probability);
    formData.append(
      "modelVersion",
      usingDemoModel ? FALLBACK_MODEL_VERSION : window.intelliEcoModelConfig?.version || "1.0.0"
    );

    const response = await fetch("/api/detections/analyze", {
      method: "POST",
      body: formData
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Analysis failed.");
    }

    renderResult(result);
    prependHistoryRow(result);
    fetchStats();
    modelStatus.textContent = usingDemoModel
      ? "Analysis complete with MobileNet fallback AI."
      : "Analysis complete.";
  } catch (error) {
    console.error(error);
    modelStatus.textContent = error.message || "Analysis failed.";
  } finally {
    analyzeBtn.disabled = false;
  }
});

locationForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await searchRecyclingCenters(locationInput.value.trim());
});

showAllCentersBtn?.addEventListener("click", async () => {
  await openCentersModal();
});

finderPreviewBtn?.addEventListener("click", async () => {
  await openCentersModal();
});

closeCentersModalBtn?.addEventListener("click", () => {
  closeCentersModal();
});

centersModalBackdrop?.addEventListener("click", () => {
  closeCentersModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeCentersModal();
  }
});

pickupRequestForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const pickupImage = pickupImageInput?.files?.[0];
  const formData = new FormData();
  let detectedItems = [];
  let linkedDetections = [...selectedPreviousDetections];

  pickupStatus.textContent = pickupImage
    ? "Analyzing pickup image before submitting..."
    : "Submitting pickup request...";

  try {
    if (pickupImage) {
      const detection = await saveDetectionFromBlob(pickupImage, pickupImage.name || "pickup-waste.jpg");
      linkedDetections = [detection];
      pickupWasteTypeInput.value = detection.wasteType;
      prependHistoryRow(detection);
      fetchStats();
    }

    if (linkedDetections.length) {
      detectedItems = groupDetectionsAsItems(linkedDetections);
      setPickupDetectedItems(detectedItems);
    } else if (pickupWasteTypeInput?.value.trim()) {
      detectedItems = [
        {
          wasteType: pickupWasteTypeInput.value.trim(),
          quantity: 1
        }
      ];
    }

    formData.append("wasteType", pickupWasteTypeInput?.value.trim() || linkedDetections[0]?.wasteType || "");
    formData.append("approximateWeightKg", pickupWeightInput?.value || "");
    formData.append("contactPhone", document.getElementById("pickupPhone")?.value.trim() || "");
    formData.append("areaName", document.getElementById("pickupArea")?.value.trim() || "");
    formData.append("addressLine", document.getElementById("pickupAddress")?.value.trim() || "");
    formData.append("latitude", document.getElementById("pickupLatitude")?.value.trim() || "");
    formData.append("longitude", document.getElementById("pickupLongitude")?.value.trim() || "");
    formData.append("notes", document.getElementById("pickupNotes")?.value.trim() || "");
    formData.append("detectedItems", JSON.stringify(detectedItems));

    if (linkedDetections.length) {
      formData.append(
        "linkedDetectionIds",
        JSON.stringify(linkedDetections.map((detection) => detection.id).filter(Boolean))
      );
      formData.append("linkedDetectionId", linkedDetections[0].id || "");
      formData.append("imagePath", linkedDetections[0].imagePath || "");
    }

    if (pickupImage) {
      formData.append("pickupImage", pickupImage);
    }

    const response = await fetch("/api/pickup-requests", {
      method: "POST",
      body: formData
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Could not submit pickup request.");
    }

    prependPickupRow(result.pickup);
    pickupRequestForm.reset();
    document.getElementById("pickupArea").value = "Kuril, Dhaka";
    selectedPreviousDetections = [];
    setPickupDetectedItems([]);
    pickupStatus.textContent =
      "Pickup request submitted successfully. Your reward will be added after pickup completion.";
  } catch (error) {
    console.error(error);
    pickupStatus.textContent = error.message || "Could not submit pickup request.";
  }
});

previousDetectionSelect?.addEventListener("change", () => {
  const option = previousDetectionSelect.selectedOptions[0];

  if (!option?.value) {
    selectedPreviousDetections = [];
    setPickupDetectedItems([]);
    return;
  }

  selectedPreviousDetections = [
    {
      id: option.value,
      wasteType: option.dataset.wasteType,
      imagePath: option.dataset.imagePath
    }
  ];

  syncPickupFromSelectedDetections();
});

pickupImageInput?.addEventListener("change", () => {
  if (pickupImageInput.files?.length) {
    previousDetectionSelect.value = "";
    selectedPreviousDetections = [];
    setPickupDetectedItems([]);
  }
});

openDetectionHistoryModalBtn?.addEventListener("click", () => {
  openDetectionHistoryModal();
});

document.querySelectorAll("[data-close-history-modal]").forEach((element) => {
  element.addEventListener("click", () => {
    closeDetectionHistoryModal();
  });
});

historyModalSearch?.addEventListener("input", () => {
  filterDetectionHistoryModal();
});

historyWasteFilter?.addEventListener("change", () => {
  filterDetectionHistoryModal();
});

applyHistorySelectionBtn?.addEventListener("click", () => {
  const selectedCheckboxes = Array.from(
    document.querySelectorAll(".history-select-checkbox:checked")
  );

  selectedPreviousDetections = selectedCheckboxes.map((checkbox) => ({
    id: checkbox.value,
    wasteType: checkbox.dataset.wasteType,
    imagePath: checkbox.dataset.imagePath
  }));

  if (previousDetectionSelect) {
    previousDetectionSelect.value =
      selectedPreviousDetections.length === 1 ? selectedPreviousDetections[0].id : "";
  }

  if (pickupImageInput) {
    pickupImageInput.value = "";
  }

  syncPickupFromSelectedDetections();
  closeDetectionHistoryModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeDetectionHistoryModal();
  }
});

bootModel();
fetchStats();
