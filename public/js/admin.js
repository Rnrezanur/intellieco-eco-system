let adminWasteChart = null;
let adminVersionChart = null;
let adminPickupTrendChart = null;

async function fetchAdminStats() {
  try {
    const response = await fetch("/admin/stats");
    const stats = await response.json();

    if (!response.ok) {
      throw new Error(stats.message || "Could not load admin statistics.");
    }

    const pendingPickups = stats.pickupSummary
      .filter((entry) => entry._id !== "picked_up")
      .reduce((total, entry) => total + entry.total, 0);
    const collectedWeight =
      stats.pickupSummary.find((entry) => entry._id === "picked_up")?.totalWeight || 0;

    document.getElementById("adminTotalRequests").textContent = stats.pickupSummary.reduce(
      (total, entry) => total + entry.total,
      0
    );
    document.getElementById("adminCollectedWeight").textContent = `${collectedWeight.toFixed(1)} kg`;
    document.getElementById("adminActiveUsers").textContent = stats.verifiedUsers;
    document.getElementById("adminPendingPickups").textContent = pendingPickups;
    updateReviewSummary(stats.reviewSummary);

    renderAdminChart(stats.wasteBreakdown);
    renderVersionChart(stats.versionBreakdown);
    renderVersionTable(stats.versionBreakdown);
    renderPickupTrendChart(stats.pickupTrend);
  } catch (error) {
    console.error(error);
  }
}

function renderAdminChart(entries) {
  const context = document.getElementById("adminWasteChart");
  if (!context) {
    return;
  }

  if (adminWasteChart) {
    adminWasteChart.destroy();
  }

  adminWasteChart = new Chart(context, {
    type: "bar",
    data: {
      labels: entries.map((entry) => entry._id),
      datasets: [
        {
          label: "Detections",
          data: entries.map((entry) => entry.total),
          backgroundColor: ["#2f8f5b", "#4db08a", "#7dc98e", "#f4b860", "#5db2d6", "#d6dde1"]
        }
      ]
    },
    options: {
      plugins: {
        legend: {
          display: false
        }
      },
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

function renderVersionChart(entries) {
  const context = document.getElementById("adminVersionChart");
  if (!context) {
    return;
  }

  if (adminVersionChart) {
    adminVersionChart.destroy();
  }

  adminVersionChart = new Chart(context, {
    type: "line",
    data: {
      labels: entries.map((entry) => entry._id || "unknown"),
      datasets: [
        {
          label: "Detections",
          data: entries.map((entry) => entry.total),
          borderColor: "#2f8f5b",
          backgroundColor: "rgba(47, 143, 91, 0.12)",
          yAxisID: "y",
          tension: 0.3
        },
        {
          label: "Average Confidence",
          data: entries.map((entry) => Number((entry.averageConfidence || 0).toFixed(3))),
          borderColor: "#f4b860",
          backgroundColor: "rgba(244, 184, 96, 0.15)",
          yAxisID: "y1",
          tension: 0.3
        }
      ]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          position: "left"
        },
        y1: {
          beginAtZero: true,
          position: "right",
          max: 1,
          grid: {
            drawOnChartArea: false
          }
        }
      }
    }
  });
}

function renderPickupTrendChart(entries) {
  const context = document.getElementById("adminPickupTrendChart");
  if (!context) {
    return;
  }

  if (adminPickupTrendChart) {
    adminPickupTrendChart.destroy();
  }

  adminPickupTrendChart = new Chart(context, {
    type: "line",
    data: {
      labels: entries.map((entry) => entry._id),
      datasets: [
        {
          label: "Pickup Requests",
          data: entries.map((entry) => entry.total),
          borderColor: "#244c38",
          backgroundColor: "rgba(36, 76, 56, 0.12)",
          fill: true,
          tension: 0.35,
          yAxisID: "y"
        },
        {
          label: "Weight (kg)",
          data: entries.map((entry) => Number((entry.weight || 0).toFixed(1))),
          borderColor: "#d88b35",
          backgroundColor: "rgba(216, 139, 53, 0.14)",
          tension: 0.35,
          yAxisID: "y1"
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
        },
        y1: {
          beginAtZero: true,
          position: "right",
          grid: {
            drawOnChartArea: false
          }
        }
      }
    }
  });
}

function renderVersionTable(entries) {
  const container = document.getElementById("modelVersionBody");
  if (!container) {
    return;
  }

  container.innerHTML = entries
    .map(
      (entry) => `
        <tr>
          <td>${entry._id || "unknown"}</td>
          <td>${entry.total}</td>
          <td>${((entry.averageConfidence || 0) * 100).toFixed(1)}%</td>
        </tr>
      `
    )
    .join("");
}

function updateReviewSummary(entries) {
  const pill = document.getElementById("reviewSummaryPill");
  if (!pill) {
    return;
  }

  const corrected = entries.find((entry) => entry._id === "corrected")?.total || 0;
  const pending = entries.find((entry) => entry._id === "pending")?.total || 0;
  pill.textContent = `${corrected} corrected, ${pending} pending`;
}

async function saveSchedule(frequency, recipients, isActive) {
  const response = await fetch(`/admin/report-schedules/${frequency}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ recipients, isActive })
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Could not update report schedule.");
  }

  return result;
}

async function saveReview(detectionId, reviewedWasteType, reviewNote) {
  const response = await fetch(`/api/detections/${detectionId}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ reviewedWasteType, reviewNote })
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Could not save detection review.");
  }

  return result;
}

async function refreshAuditLogs() {
  const container = document.getElementById("auditLogList");
  if (!container) {
    return;
  }

  try {
    const response = await fetch("/admin/audit-logs");
    const logs = await response.json();
    if (!response.ok) {
      throw new Error("Could not load audit logs.");
    }

    container.innerHTML = logs
      .map(
        (log) => `
          <article class="audit-card">
            <strong>${log.actionType}</strong>
            <p>${log.adminUser?.email || "Unknown admin"} acted on ${log.targetType}</p>
            <p>${new Date(log.createdAt).toLocaleString()}</p>
          </article>
        `
      )
      .join("");
  } catch (error) {
    console.error(error);
  }
}

async function updateRole(userId, role) {
  const response = await fetch(`/admin/users/${userId}/role`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ role })
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Could not update role.");
  }

  return result;
}

async function updatePickupRequest(pickupId, status, assignedTo) {
  const response = await fetch(`/api/pickup-requests/${pickupId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ status, assignedTo })
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Could not update pickup request.");
  }

  return result;
}

document.querySelectorAll(".save-role-btn").forEach((button) => {
  button.addEventListener("click", async () => {
    const row = button.closest("tr");
    const userId = row?.dataset.userId;
    const role = row?.querySelector(".role-select")?.value;

    if (!userId || !role) {
      return;
    }

    button.disabled = true;
    button.textContent = "Saving...";

    try {
      await updateRole(userId, role);
      button.textContent = "Saved";
      setTimeout(() => {
        button.textContent = "Save Role";
        button.disabled = false;
      }, 1200);
      fetchAdminStats();
      refreshAuditLogs();
    } catch (error) {
      console.error(error);
      button.textContent = "Retry";
      button.disabled = false;
    }
  });
});

document.querySelectorAll(".schedule-form").forEach((form) => {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const frequency = form.dataset.frequency;
    const recipients = form.querySelector(".schedule-recipients")?.value || "";
    const isActive = form.querySelector(".schedule-active")?.checked || false;
    const button = form.querySelector("button");

    button.disabled = true;
    button.textContent = "Saving...";

    try {
      await saveSchedule(frequency, recipients, isActive);
      button.textContent = "Saved";
      setTimeout(() => {
        button.textContent = "Save Schedule";
        button.disabled = false;
      }, 1200);
      refreshAuditLogs();
    } catch (error) {
      console.error(error);
      button.textContent = "Retry";
      button.disabled = false;
    }
  });
});

document.querySelectorAll(".review-form").forEach((form) => {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const row = form.closest("tr");
    const detectionId = row?.dataset.detectionId;
    const reviewedWasteType = form.querySelector(".review-select")?.value;
    const reviewNote = form.querySelector(".review-note")?.value || "";
    const button = form.querySelector("button");
    const status = form.querySelector(".status-text");

    button.disabled = true;
    button.textContent = "Saving...";

    try {
      const result = await saveReview(detectionId, reviewedWasteType, reviewNote);
      status.textContent = `Corrected to ${result.detection.reviewedWasteType}`;
      button.textContent = "Saved";
      setTimeout(() => {
        button.textContent = "Save Review";
        button.disabled = false;
      }, 1200);
      fetchAdminStats();
      refreshAuditLogs();
    } catch (error) {
      console.error(error);
      button.textContent = "Retry";
      button.disabled = false;
    }
  });
});

document.querySelectorAll(".save-pickup-btn").forEach((button) => {
  button.addEventListener("click", async () => {
    const row = button.closest("tr");
    const pickupId = row?.dataset.pickupId;
    const status = row?.querySelector(".pickup-status-select")?.value;
    const assignedTo = row?.querySelector(".pickup-assignee-input")?.value || "";

    if (!pickupId) {
      return;
    }

    button.disabled = true;
    button.textContent = "Saving...";

    try {
      const result = await updatePickupRequest(pickupId, status, assignedTo);
      button.textContent = result.reward ? `Saved + ${result.reward.points} pts` : "Saved";
      setTimeout(() => {
        button.textContent = "Save Pickup";
        button.disabled = false;
      }, 1200);
      refreshAuditLogs();
    } catch (error) {
      console.error(error);
      button.textContent = "Retry";
      button.disabled = false;
    }
  });
});

function openAdminModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) {
    return;
  }

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  modal.querySelector(".admin-modal-search")?.focus();
}

function closeAdminModal(modal) {
  if (!modal) {
    return;
  }

  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function filterAdminModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) {
    return;
  }

  const searchValue = modal.querySelector(".admin-modal-search")?.value.trim().toLowerCase() || "";
  const filters = Array.from(modal.querySelectorAll(".admin-modal-filter"));

  modal.querySelectorAll(".admin-modal-row").forEach((row) => {
    const matchesSearch = !searchValue || row.dataset.search?.includes(searchValue);
    const matchesFilters = filters.every((filter) => {
      const filterValue = filter.value;
      const filterKey = filter.dataset.filterKey;
      return !filterValue || row.dataset[filterKey] === filterValue;
    });

    row.classList.toggle("hidden", !(matchesSearch && matchesFilters));
  });
}

document.querySelectorAll(".open-admin-modal-btn").forEach((button) => {
  button.addEventListener("click", () => {
    openAdminModal(button.dataset.modalTarget);
  });
});

document.querySelectorAll("[data-close-admin-modal]").forEach((element) => {
  element.addEventListener("click", () => {
    closeAdminModal(element.closest(".admin-list-modal"));
  });
});

document.querySelectorAll(".admin-modal-search").forEach((input) => {
  input.addEventListener("input", () => {
    filterAdminModal(input.dataset.modalSearch);
  });
});

document.querySelectorAll(".admin-modal-filter").forEach((select) => {
  select.addEventListener("change", () => {
    filterAdminModal(select.dataset.modalFilter);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  document.querySelectorAll(".admin-list-modal:not(.hidden)").forEach((modal) => {
    closeAdminModal(modal);
  });
});

fetchAdminStats();
refreshAuditLogs();
