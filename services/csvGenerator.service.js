const axios = require("axios");
const { format } = require("date-fns");
const { Buffer } = require("buffer");

async function getUserInfo(apiKey) {
  try {
    const headers = {
      "X-Api-Key": apiKey,
      "Content-Type": "application/json",
    };

    const response = await axios.get("https://api.clockify.me/api/v1/user", {
      headers,
    });
    return {
      userId: response.data.id,
      workspaceId: response.data.activeWorkspace,
    };
  } catch (error) {
    console.error("Error fetching user info:", error);
    throw error;
  }
}

async function getTimeEntries(apiKey, workspaceId, userId) {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    console.log("Fetching time entries from:", startOfMonth.toISOString());
    console.log("To:", endOfMonth.toISOString());

    const headers = {
      "X-Api-Key": apiKey,
      "Content-Type": "application/json",
    };

    const url = `https://api.clockify.me/api/v1/workspaces/${workspaceId}/user/${userId}/time-entries`;
    const response = await axios.get(url, {
      headers,
      params: {
        start: startOfMonth.toISOString(),
        end: endOfMonth.toISOString(),
        "page-size": 5000,
      },
    });

    const filteredEntries = response.data.filter((entry) => {
      const entryDate = new Date(entry.timeInterval.start);
      return entryDate >= startOfMonth && entryDate <= endOfMonth;
    });

    console.log(
      `Total entries: ${response.data.length}, Filtered entries: ${filteredEntries.length}`
    );
    return filteredEntries;
  } catch (error) {
    console.error("Error fetching time entries:", error);
    throw error;
  }
}

function parseDuration(durationStr) {
  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (durationStr.includes("H")) {
    hours = parseInt(durationStr.split("H")[0].replace("PT", ""));
    durationStr = durationStr.split("H")[1];
  } else {
    durationStr = durationStr.replace("PT", "");
  }

  if (durationStr.includes("M")) {
    minutes = parseInt(durationStr.split("M")[0]);
    durationStr = durationStr.split("M")[1];
  }

  if (durationStr.includes("S")) {
    seconds = parseInt(durationStr.replace("S", ""));
  }

  // 将小时、分钟和秒转换为小时
  const totalHours = hours + minutes / 60 + seconds / 3600;

  // 将小时数四舍五入到最近的0.5
  return Math.round(totalHours * 2) / 2;
}

function processTimeEntries(entries) {
  const descriptions = new Set();
  const dates = new Set();
  const timeMatrix = new Map();

  entries.forEach((entry) => {
    const description = entry.description;
    const startTime = new Date(entry.timeInterval.start);
    const date = format(startTime, "yyyy-MM-dd");
    const durationStr = entry.timeInterval.duration;
    if (!durationStr) {
      return;
    }
    const duration = parseDuration(durationStr);

    descriptions.add(description);
    dates.add(date);

    if (!timeMatrix.has(description)) {
      timeMatrix.set(description, new Map());
    }
    const descMap = timeMatrix.get(description);
    descMap.set(date, (descMap.get(date) || 0) + duration);
  });

  return {
    descriptions: Array.from(descriptions).sort(),
    dates: Array.from(dates).sort(),
    matrix: timeMatrix,
  };
}

function generateCsvContent(data) {
  const { descriptions, dates, matrix } = data;
  const rows = [];

  // Header row
  rows.push(["Description", ...dates].join(","));

  // Data rows
  descriptions.forEach((desc) => {
    const row = [desc];
    dates.forEach((date) => {
      const duration = matrix.get(desc)?.get(date) || 0;
      row.push(duration > 0 ? duration.toFixed(2) : "");
    });
    rows.push(row.join(","));
  });

  return rows.join("\n");
}

async function generateTimeReport(req) {
  const apiKey = req.body.apiKey;
  try {
    const userInfo = await getUserInfo(apiKey);
    const timeEntries = await getTimeEntries(
      apiKey,
      userInfo.workspaceId,
      userInfo.userId
    );

    const processedData = processTimeEntries(timeEntries);
    const csvContent = generateCsvContent(processedData);

    // Convert CSV content to base64
    const base64Content = Buffer.from(csvContent).toString("base64");

    return base64Content;
  } catch (error) {
    console.error("Error generating time report:", error);
    throw error;
  }
}

module.exports = {
  generateTimeReport,
};
