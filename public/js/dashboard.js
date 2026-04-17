const detectionForm = document.getElementById("detectionForm");
const wasteImageInput = document.getElementById("wasteImage");
const previewImage = document.getElementById("previewImage");
const modelStatus = document.getElementById("modelStatus");
const resultCard = document.getElementById("resultCard");
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
const finderActions = document.getElementById("finderActions");
const seeAllCentersBtn = document.getElementById("seeAllCentersBtn");
const centersModal = document.getElementById("centersModal");
const centersModalBackdrop = document.getElementById("centersModalBackdrop");
const closeCentersModalBtn = document.getElementById("closeCentersModalBtn");
const centersModalList = document.getElementById("centersModalList");
const centersModalSubtitle = document.getElementById("centersModalSubtitle");
const modelModeBadge = document.getElementById("modelModeBadge");
const modelFallbackText = document.getElementById("modelFallbackText");
const pickupRequestForm = document.getElementById("pickupRequestForm");
const pickupStatus = document.getElementById("pickupStatus");
const pickupHistoryBody = document.getElementById("pickupHistoryBody");
const rewardPointsTotal = document.getElementById("rewardPointsTotal");
const rewardedPickupTotal = document.getElementById("rewardedPickupTotal");

let wasteModel = null;
let currentImageBlob = null;
let currentStream = null;
let wasteBreakdownChart = null;
let wasteTrendChart = null;
let map = null;
let mapMarkers = [];
let usingDemoModel = false;
let currentCenters = [];
let currentCenterLocation = "";

const DEMO_WASTE_RULES = [
  { keywords: ["bottle", "plastic", "pet", "water"], label: "plastic", confidence: 0.86 },
  { keywords: ["can", "metal", "aluminum", "tin"], label: "metal", confidence: 0.82 },
  { keywords: ["paper", "book", "cardboard", "newspaper"], label: "paper", confidence: 0.8 },
  { keywords: ["banana", "food", "leaf", "organic"], label: "organic", confidence: 0.78 },
  { keywords: ["glass", "jar"], label: "glass", confidence: 0.81 }
];

function setMapStatus(message) {
  if (mapStatus) {
    mapStatus.textContent = message;
  }
}

function renderResult(result) {
  resultCard.classList.remove("empty");
  resultCard.innerHTML = `
    <span class="badge">${result.wasteType}</span>
    <p><strong>Model Label:</strong> ${result.predictedLabel}</p>
    <p><strong>Model Version:</strong> ${result.modelVersion}</p>
    <img src="${result.imagePath}" alt="${result.wasteType}" class="preview-image" />
    <p><strong>Confidence:</strong> ${
      result.confidence ? `${(result.confidence * 100).toFixed(1)}%` : "Not available"
    }</p>
    <p><strong>Recycling Suggestion:</strong> ${result.suggestion}</p>
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
    modelStatus.textContent = "Custom model configuration is missing.";
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
    modelStatus.textContent =
      "Custom model could not load. Demo detection mode is active so you can still test the app.";
  }
}

function guessWasteFromFilename(file) {
  const source = String(file?.name || "").toLowerCase();
  const matchedRule = DEMO_WASTE_RULES.find((rule) =>
    rule.keywords.some((keyword) => source.includes(keyword))
  );

  if (matchedRule) {
    return {
      className: matchedRule.label,
      probability: matchedRule.confidence
    };
  }

  return {
    className: "plastic",
    probability: 0.65
  };
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

function updateRecyclingList(locations) {
  if (!locations.length) {
    finderActions?.classList.add("hidden");
    recyclingList.innerHTML = `
      <div class="recycling-card recycling-card-tip">
        <h3>No recycling centers found</h3>
        <p>Try a nearby larger area or another search term.</p>
      </div>
    `;
    return;
  }

  const previewCenters = locations.slice(0, 2);
  finderActions?.classList.toggle("hidden", locations.length <= 2);

  recyclingList.innerHTML = previewCenters
    .map(
      (location) => `
        <div class="recycling-card">
          <div class="recycling-card-head">
            <h3>${location.name}</h3>
            <span class="mini-badge">${location.type}</span>
          </div>
          <p>${location.address || "Address not provided"}</p>
        </div>
      `
    )
    .join("");
}

function renderAllCentersModal() {
  if (!centersModalList) {
    return;
  }

  if (!currentCenters.length) {
    centersModalList.innerHTML = `
      <div class="recycling-card recycling-card-tip">
        <h3>No recycling centers found</h3>
        <p>Search another area to load center details.</p>
      </div>
    `;
    return;
  }

  centersModalList.innerHTML = currentCenters
    .map(
      (location) => `
        <div class="recycling-card">
          <div class="recycling-card-head">
            <h3>${location.name}</h3>
            <span class="mini-badge">${location.type}</span>
          </div>
          <p>${location.address || "Address not provided"}</p>
        </div>
      `
    )
    .join("");
}

function openCentersModal() {
  if (!centersModal || !currentCenters.length) {
    return;
  }

  renderAllCentersModal();
  if (centersModalSubtitle) {
    centersModalSubtitle.textContent = `Showing ${currentCenters.length} center${currentCenters.length === 1 ? "" : "s"} in ${currentCenterLocation}.`;
  }
  centersModal.classList.remove("hidden");
  document.body.classList.add("modal-open");
}

function closeCentersModal() {
  if (!centersModal) {
    return;
  }

  centersModal.classList.add("hidden");
  document.body.classList.remove("modal-open");
}

function prependPickupRow(pickup) {
  const emptyRow = pickupHistoryBody.querySelector("td[colspan='7']");
  if (emptyRow) {
    emptyRow.parentElement.remove();
  }

  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${pickup.wasteType}</td>
    <td>${pickup.areaName}</td>
    <td>${pickup.contactPhone}</td>
    <td>${pickup.status}</td>
    <td>${pickup.rewardStatus === "earned" ? `${pickup.rewardPoints} pts` : "Pending"}</td>
    <td>${pickup.assignedTo || "Not assigned"}</td>
    <td>${new Date(pickup.createdAt || Date.now()).toLocaleString()}</td>
  `;
  pickupHistoryBody.prepend(row);
}

async function searchRecyclingCenters(placeName) {
  if (!placeName) {
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

  setMapStatus("Searching nearby recycling centers...");

  try {
    const response = await fetch(`/api/recycling-centers?query=${encodeURIComponent(placeName)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Location search failed.");
    }

    map.setView([data.location.lat, data.location.lon], 13);

    mapMarkers.forEach((marker) => marker.remove());
    mapMarkers = [];

    data.centers.forEach((location) => {
      const marker = L.marker([location.lat, location.lon])
        .addTo(map)
        .bindPopup(`<strong>${location.name}</strong><br/>${location.address}`);
      mapMarkers.push(marker);
    });

    currentCenters = data.centers;
    currentCenterLocation = data.location.name;
    updateRecyclingList(data.centers);
    setMapStatus(
      `${data.centers.length} recycling center${data.centers.length === 1 ? "" : "s"} found in ${data.location.name}.`
    );
    setTimeout(() => map?.invalidateSize(), 0);
  } catch (error) {
    console.error(error);
    finderResults?.classList.add("hidden");
    finderActions?.classList.add("hidden");
    currentCenters = [];
    currentCenterLocation = "";
    closeCentersModal();
    setMapStatus(error.message || "Could not load recycling centers for that area right now.");
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

  modelStatus.textContent = usingDemoModel
    ? "Analyzing image with demo detection mode..."
    : "Analyzing image with custom model...";

  const imageElement = new Image();
  imageElement.src = URL.createObjectURL(currentImageBlob);

  imageElement.onload = async () => {
    try {
      let bestPrediction;

      if (wasteModel) {
        const predictions = await wasteModel.predict(imageElement);
        bestPrediction = predictions.sort((left, right) => right.probability - left.probability)[0];
      } else {
        bestPrediction = guessWasteFromFilename(currentImageBlob);
      }

      if (!bestPrediction) {
        throw new Error("The custom model did not return a prediction.");
      }

      const formData = new FormData();
      formData.append("wasteImage", currentImageBlob, "waste-image.jpg");
      formData.append("predictedLabel", bestPrediction.className);
      formData.append("confidence", bestPrediction.probability);
      formData.append(
        "modelVersion",
        usingDemoModel ? "demo-visible-mode" : window.intelliEcoModelConfig?.version || "1.0.0"
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
        ? "Analysis complete in demo mode."
        : "Analysis complete.";
    } catch (error) {
      console.error(error);
      modelStatus.textContent = error.message || "Analysis failed.";
    }
  };
});

locationForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await searchRecyclingCenters(locationInput.value.trim());
});

seeAllCentersBtn?.addEventListener("click", () => {
  openCentersModal();
});

closeCentersModalBtn?.addEventListener("click", () => {
  closeCentersModal();
});

centersModalBackdrop?.addEventListener("click", () => {
  closeCentersModal();
});

pickupRequestForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    wasteType: document.getElementById("pickupWasteType")?.value.trim(),
    contactPhone: document.getElementById("pickupPhone")?.value.trim(),
    areaName: document.getElementById("pickupArea")?.value.trim(),
    addressLine: document.getElementById("pickupAddress")?.value.trim(),
    latitude: document.getElementById("pickupLatitude")?.value.trim(),
    longitude: document.getElementById("pickupLongitude")?.value.trim(),
    notes: document.getElementById("pickupNotes")?.value.trim()
  };

  pickupStatus.textContent = "Submitting pickup request...";

  try {
    const response = await fetch("/api/pickup-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Could not submit pickup request.");
    }

    prependPickupRow(result.pickup);
    pickupRequestForm.reset();
    document.getElementById("pickupArea").value = "Kuril, Dhaka";
    pickupStatus.textContent =
      "Pickup request submitted successfully. Your reward will be added after pickup completion.";
  } catch (error) {
    console.error(error);
    pickupStatus.textContent = error.message || "Could not submit pickup request.";
  }
});

bootModel();
fetchStats();
