console.log("content.js");

// Create and append the floating div
const floatingDiv = document.createElement('div');
floatingDiv.style.position = 'fixed';
floatingDiv.style.bottom = '20px';
floatingDiv.style.right = '20px';
floatingDiv.style.width = '25px';
floatingDiv.style.height = '25px';
floatingDiv.style.backgroundColor = 'white';
floatingDiv.style.zIndex = '9999';
floatingDiv.style.display = 'flex';
floatingDiv.style.alignItems = 'center';
floatingDiv.style.justifyContent = 'center';
floatingDiv.style.overflow = 'hidden';
floatingDiv.style.cursor = 'grab';
floatingDiv.style.backgroundColor = 'transparent';

// Add dragging functionality
let isDragging = false;
let offsetX, offsetY;

floatingDiv.addEventListener('mousedown', (e) => {
  isDragging = true;
  offsetX = e.clientX - floatingDiv.getBoundingClientRect().left;
  offsetY = e.clientY - floatingDiv.getBoundingClientRect().top;
  floatingDiv.style.cursor = 'grabbing';
});

document.addEventListener('mousemove', (e) => {
  if (isDragging) {
    floatingDiv.style.left = `${e.clientX - offsetX}px`;
    floatingDiv.style.top = `${e.clientY - offsetY}px`;
    floatingDiv.style.right = 'auto';
    floatingDiv.style.bottom = 'auto';
  }
});

document.addEventListener('mouseup', () => {
  if (isDragging) {
    isDragging = false;
    floatingDiv.style.cursor = 'grab';
  }
});

// Create a span element instead of textarea
const textSpan = document.createElement('span');
textSpan.style.width = '100%';
textSpan.style.height = '100%';
textSpan.style.border = 'none';
textSpan.style.outline = 'none';
textSpan.style.fontSize = '12px';
textSpan.style.backgroundColor = 'transparent';
textSpan.style.color = 'black';
textSpan.style.borderRadius = '0%';
textSpan.style.display = 'flex';
// textSpan.style.alignItems = 'center';
// textSpan.style.justifyContent = 'center';
textSpan.style.userSelect = 'none';
// textSpan.style.overflow = 'visible'; // or let the container scroll


// Add click-to-copy functionality
textSpan.addEventListener('click', () => {
  navigator.clipboard.writeText(textSpan.textContent).then(() => {
    console.log('Text copied to clipboard');
  }).catch(err => {
    console.error('Failed to copy text: ', err);
  });
});

// Append the span to the floating div
floatingDiv.appendChild(textSpan);
document.body.appendChild(floatingDiv);

// Assign an ID to floatingDiv for CSS targeting
floatingDiv.id = 'floating-div';

// Inject CSS to hide scrollbars
const style = document.createElement('style');
style.textContent = `
  #floating-div::-webkit-scrollbar {
    display: none; /* Hide scrollbar for WebKit browsers */
  }
  #floating-div {
    scrollbar-width: none; /* Hide scrollbar for Firefox */
    -ms-overflow-style: none; /* Hide scrollbar for Edge */
  }
`;
document.head.appendChild(style);

// Make the floating div scrollable on hover without showing scrollbars
floatingDiv.addEventListener('mouseenter', () => {
  floatingDiv.style.overflow = 'auto';
});

floatingDiv.addEventListener('mouseleave', () => {
  floatingDiv.style.overflow = 'hidden';
});

// Handle external message updates for the text content
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updatetextarea' && message.text) {
    textSpan.textContent = message.text; // Set the received text in the span
    console.log("Text received and set in content.js:", message.text);
  }
});

const popupContainer = document.createElement("div");
popupContainer.id = "floating-popup";
Object.assign(popupContainer.style, {
    position: "fixed",
    bottom: "70px",
    right: "20px",
    width: "350px",
    height: "500px",
    zIndex: "10001",
    boxShadow: "0 0 10px rgba(0, 0, 0, 0.5)",
    borderRadius: "10px",
    backgroundColor: "#ffffff",
    display: "none",
});

// Load the popup content into the container
const iframe = document.createElement("iframe");
iframe.src = chrome.runtime.getURL("popup.html");
Object.assign(iframe.style, {
    border: "none",
    width: "100%",
    height: "100%",
});

// Append the iframe to the popup container
popupContainer.appendChild(iframe);

// Append the popup container to the body
document.body.appendChild(popupContainer);

// Listen for messages to toggle the widget visibility
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "toggleWidget") {
        popupContainer.style.display = popupContainer.style.display === "none" ? "block" : "none";
        sendResponse({ status: "toggled" });
    }
});