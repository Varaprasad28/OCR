let startX, startY, endX, endY;
let selectionBox;

document.body.style.position = 'relative';

function onMouseDown(event) {
  // Create a div to represent the selection box
  selectionBox = document.createElement('div');
  selectionBox.style.position = 'absolute';
  selectionBox.style.border = '2px dashed #000';
  selectionBox.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
  selectionBox.style.zIndex = '9999'; // Make sure the box is on top
  document.body.appendChild(selectionBox);

  // Get the starting mouse coordinates
  startX = event.clientX;
  startY = event.clientY;

  // Set initial position of the selection box
  selectionBox.style.left = `${startX}px`;
  selectionBox.style.top = `${startY}px`;

  // Listen for mouse move and up events
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

function onMouseMove(event) {
  // Calculate the width and height of the selection box
  const width = event.clientX - startX;
  const height = event.clientY - startY;

  // Set the dimensions of the selection box
  selectionBox.style.width = `${Math.abs(width)}px`;
  selectionBox.style.height = `${Math.abs(height)}px`;

  // Adjust the position if the user drags in reverse direction
  selectionBox.style.left = `${Math.min(event.clientX, startX)}px`;
  selectionBox.style.top = `${Math.min(event.clientY, startY)}px`;
}

function onMouseUp(event) {
  // Get the end coordinates
  endX = event.clientX;
  endY = event.clientY;

  // Calculate the width and height of the selected area
  const selectedWidth = Math.abs(endX - startX);
  const selectedHeight = Math.abs(endY - startY);
  
  // Send the selection coordinates to the background script
  chrome.runtime.sendMessage({
    type: 'selection_complete',
    startX: Math.min(startX, endX),
    startY: Math.min(startY, endY),
    width: selectedWidth,
    height: selectedHeight
  });

  // Clean up the selection box
  selectionBox.remove();
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
}

// Listen for mousedown event to start selecting
document.addEventListener('mousedown', onMouseDown);
