// ✅ Fetch schedule & quotes in parallel
Promise.all([
  fetch("schedule.json").then(res => res.json()).catch(err => {
    console.error("Error fetching schedule.json:", err);
    return null;
  }),
  fetch("quotes.json").then(res => res.json()).catch(err => {
    console.error("Error fetching quotes.json:", err);
    return null;
  })
]).then(([schedule, quotes]) => {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes(); // Convert time to minutes

  let scheduleMessage = "No task scheduled now.";
  let quoteCategory = "general";

  if (schedule) {
    for (const timeRange in schedule) {
      const [startH, startM] = timeRange.split("-")[0].split(":").map(Number);
      const [endH, endM] = timeRange.split("-")[1].split(":").map(Number);
      const startTime = startH * 60 + startM;
      const endTime = endH * 60 + endM;

      if (currentTime >= startTime && currentTime <= endTime) {
        scheduleMessage = schedule[timeRange].task;
        quoteCategory = schedule[timeRange].category;
        break;
      }
    }
  }

  document.getElementById("schedule").textContent = scheduleMessage;

  // ✅ Debugging: Check if quotes exist
  if (!quotes) {
    console.error("Error: quotes.json could not be loaded.");
    document.getElementById("quote").textContent = "No quotes available.";
    return;
  }

  if (!quotes[quoteCategory] || quotes[quoteCategory].length === 0) {
    console.warn(`No quotes found for category: ${quoteCategory}`);
    document.getElementById("quote").textContent = "No quotes available.";
    return;
  }

  const categoryQuotes = quotes[quoteCategory];
  const randomQuoteObject = categoryQuotes[Math.floor(Math.random() * categoryQuotes.length)];

  let quoteHTML = randomQuoteObject.text;
  if (randomQuoteObject.link) {
    quoteHTML += ` <br><a href="${randomQuoteObject.link}" target="_blank" style="color: #ff4d00; font-weight: bold;">(Go Here)</a>`;
  }

  document.getElementById("quote").innerHTML = quoteHTML;
}).catch(error => console.error("Unexpected error:", error));








// ✅ Pomodoro Timer with Persistence using BroadcastChannel
let timer;
let minutes = 25;
let seconds = 0;
let isRunning = false;

const channel = new BroadcastChannel('timer_channel');  // Channel for real-time sync across tabs

// Update the display of the timer
function updateTimerDisplay() {
    document.getElementById("timer").innerText = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Load saved timer state from localStorage
function loadTimerState() {
    const savedMinutes = localStorage.getItem('minutes');
    const savedSeconds = localStorage.getItem('seconds');
    const savedIsRunning = localStorage.getItem('isRunning');
    const savedTimestamp = localStorage.getItem('timestamp');  // Save timestamp when the timer started

    // If we have the saved minutes and seconds
    if (savedMinutes && savedSeconds) {
        minutes = parseInt(savedMinutes);
        seconds = parseInt(savedSeconds);
    }

    // If the timer was running, we need to calculate how much time has passed
    if (savedIsRunning === 'true' && savedTimestamp) {
        const elapsedTime = Math.floor((Date.now() - savedTimestamp) / 1000); // Calculate elapsed time in seconds
        seconds -= elapsedTime % 60; // Update seconds
        minutes -= Math.floor(elapsedTime / 60); // Update minutes
        if (seconds < 0) {
            seconds += 60;
            minutes -= 1;
        }
    }

    // Update the display with the loaded state
    updateTimerDisplay();

    // If the timer is running, start the timer immediately
    if (savedIsRunning === 'true') {
        isRunning = true;
        startTimer(); // Resume the timer
    }
}

// Save timer state to localStorage
function saveTimerState() {
    localStorage.setItem('minutes', minutes);
    localStorage.setItem('seconds', seconds);
    localStorage.setItem('isRunning', isRunning);
    localStorage.setItem('timestamp', Date.now()); // Store the current timestamp when timer started/paused
}

// Broadcast timer state change to all tabs
function broadcastState() {
    channel.postMessage({
        minutes: minutes,
        seconds: seconds,
        isRunning: isRunning,
    });
}

// Start the timer
function startTimer() {
    if (!isRunning) {
        isRunning = true;
        saveTimerState(); // Save the state when the timer starts
        broadcastState(); // Broadcast the state
        timer = setInterval(() => {
            if (seconds === 0) {
                if (minutes === 0) {
                    clearInterval(timer);
                    isRunning = false;
                    alert("Time's up!");
                } else {
                    minutes--;
                    seconds = 59;
                }
            } else {
                seconds--;
            }
            saveTimerState(); // Save state on each tick
            broadcastState(); // Broadcast the state on each tick
            updateTimerDisplay();
        }, 1000);
    }
}

// Pause the timer
function pauseTimer() {
    clearInterval(timer);
    isRunning = false;
    saveTimerState(); // Save state when paused
    broadcastState(); // Broadcast the state
}

// Reset the timer
function resetTimer() {
    clearInterval(timer);
    minutes = 25;
    seconds = 0;
    isRunning = false;
    saveTimerState(); // Save state when reset
    broadcastState(); // Broadcast the state
    updateTimerDisplay();
}

// Attach event listeners
document.getElementById("startButton").addEventListener("click", startTimer);
document.getElementById("pauseButton").addEventListener("click", pauseTimer);
document.getElementById("resetButton").addEventListener("click", resetTimer);

// Initialize timer display and load saved state
window.onload = loadTimerState;

// Sync state across tabs using BroadcastChannel
channel.addEventListener('message', (event) => {
    const { minutes: newMinutes, seconds: newSeconds, isRunning: newIsRunning } = event.data;
    if (newMinutes !== minutes || newSeconds !== seconds || newIsRunning !== isRunning) {
        minutes = newMinutes;
        seconds = newSeconds;
        isRunning = newIsRunning;
        updateTimerDisplay();
        // If the timer is running and it's not the current tab, resume it
        if (isRunning && !timer) {
            startTimer(); // Restart the timer if needed
        }
    }
});
;













// 🎯 Daily Goal Tracker: Store & Retrieve Goals in Chrome Storage
document.addEventListener("DOMContentLoaded", () => {
  loadGoals(); // Load stored goals when extension opens

  document.getElementById("addGoalBtn").addEventListener("click", addGoal);
});

function addGoal() {
  let goalInput = document.getElementById("goalInput");
  let goalText = goalInput.value.trim();

  if (goalText === "") return; // Prevent empty input

  let goalList = document.getElementById("goalList");
  let listItem = createGoalElement(goalText);

  goalList.appendChild(listItem);
  saveGoal(goalText);
  goalInput.value = ""; // Clear input field
}

function createGoalElement(goalText) {
  let listItem = document.createElement("li");
  listItem.innerHTML = `${goalText} <button class="remove-btn">❌</button>`;
  listItem.querySelector(".remove-btn").addEventListener("click", () => removeGoal(goalText, listItem));
  return listItem;
}

function saveGoal(goal) {
  chrome.storage.sync.get({ goals: [] }, function (data) {
      let goals = new Set(data.goals); // Ensure uniqueness
      goals.add(goal);
      chrome.storage.sync.set({ goals: Array.from(goals) });
  });
}

function loadGoals() {
  chrome.storage.sync.get({ goals: [] }, function (data) {
      let goalList = document.getElementById("goalList");
      goalList.innerHTML = ""; // Clear old list before adding new items

      data.goals.forEach(goal => {
          let listItem = createGoalElement(goal);
          goalList.appendChild(listItem);
      });
  });
}

function removeGoal(goalText, listItem) {
  // Remove from UI
  listItem.remove();

  // Remove from storage
  chrome.storage.sync.get({ goals: [] }, function (data) {
      let updatedGoals = data.goals.filter(goal => goal !== goalText);
      chrome.storage.sync.set({ goals: updatedGoals });
  });
}







function fetchTradingData() {
  fetch("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT")
    .then(response => response.json())
    .then(data => {
      document.getElementById("btc-price").textContent = `BTC: $${parseFloat(data.price).toFixed(2)}`;
    });

  fetch("https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT")
    .then(response => response.json())
    .then(data => {
      document.getElementById("eth-price").textContent = `ETH: $${parseFloat(data.price).toFixed(2)}`;
    });

  fetch("https://query1.finance.yahoo.com/v7/finance/quote?symbols=^NSEI")
    .then(response => response.json())
    .then(data => {
      const nifty = data.quoteResponse.result[0];
      document.getElementById("nifty-price").textContent = `NIFTY 50: ₹${nifty.regularMarketPrice}`;
    });
}

function fetchForexData() {
  fetch("https://api.exchangerate.host/latest?base=USD")
    .then(response => response.json())
    .then(data => {
      console.log("Forex Data:", data.rates); // Debugging purpose
    });
}

// Fetch every 5 seconds
setInterval(fetchTradingData, 5000);
setInterval(fetchForexData, 10000);
fetchTradingData();
fetchForexData();
