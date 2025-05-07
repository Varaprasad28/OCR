console.log("worker.js");
'use strict';

let savedText = ''; // Store extracted text here
let timer = null; // Timer to handle the 5-second delay
let processingCount = 0; // Track the number of commands being processed

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "run_ocr" || command === "run_ocr1" || command === "run_ocr2" || command === "run_ocr3") {
    try {
      processingCount++; // Increment processing counter
      // Capture the screen
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('Capturing screenshot...');

      chrome.tabs.captureVisibleTab(null, { format: 'png' }, async function(screenshotUrl) {
        console.log('Screenshot captured, URL:', screenshotUrl);

        if (screenshotUrl) {
          let azureResultText = "";
          if (command === "run_ocr3") {
            // Crop the left 45% of the image
            const leftImageUrl = await cropHalf(screenshotUrl, 'left');
            console.log('Left (45%) cropped image base64 URL:', leftImageUrl);

            // Crop the right 55% of the image
            const rightImageUrl = await cropHalf(screenshotUrl, 'right');
            console.log('Right (55%) cropped image base64 URL:', rightImageUrl);

            // Convert base64 URLs to ArrayBuffer for Azure Vision API
            const leftImageBuffer = await urlToArrayBuffer(leftImageUrl);
            const rightImageBuffer = await urlToArrayBuffer(rightImageUrl);

            // Analyze both cropped images
            console.log('Analyzing left (45%) image with Azure Vision API...');
            const leftAzureResultText = await analyzeImageAzure(leftImageBuffer);
            console.log('Azure Vision API result for left (45%) image:', leftAzureResultText);

            console.log('Analyzing right (55%) image with Azure Vision API...');
            const rightAzureResultText = await analyzeImageAzure(rightImageBuffer);
            console.log('Azure Vision API result for right (55%) image:', rightAzureResultText);

            // Combine the results
            azureResultText = `Left 45%:\n${leftAzureResultText}\n\nRight 55%:\n${rightAzureResultText}`;
          } else {
            // Convert base64 URL to ArrayBuffer for Azure Vision API
            console.log('Converting screenshot URL to ArrayBuffer...');
            const imageBuffer = await urlToArrayBuffer(screenshotUrl);

            // Analyze image with Azure Vision API
            console.log('Analyzing image with Azure Vision API...');
            azureResultText = await analyzeImageAzure(imageBuffer);
            console.log('Azure Vision API analysis result:', azureResultText);
          }

          if (azureResultText) {
            // Append the extracted text to the savedText variable
            console.log('Appending extracted text to savedText:', azureResultText);
            savedText += azureResultText + '\n';
          } else {
            console.error('Error analyzing screenshot with Azure Vision API.');
          }
        } else {
          console.error('Failed to capture screenshot.');
        }

        processingCount--; // Decrement processing counter

        // Set timer only if no commands are being processed
        if (processingCount === 0) {
          if (timer) {
            clearTimeout(timer);
          }
          timer = setTimeout(async () => {
            // Send savedText to Gemini API
            const geminiApiKey = "<geminiApiKey>";
            const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiApiKey}`;

            const promptText = getPromptText(command, savedText);
            const data = {
              contents: [
                {
                  parts: [
                    {
                      text: promptText
                    }
                  ]
                }
              ]
            };

            // Send request to Gemini API
            console.log('Sending request to Gemini API...');
            try {
              const response = await fetch(geminiApiUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
              });

              if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error ${response.status}: ${response.statusText} - ${errorText}`);
              }

              const result = await response.json(); // Parse response as JSON
              const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
              console.log('Full Gemini API Response:', text);
              // Send the result to the active tab's textarea
              chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'updatetextarea', text });
              });
            } catch (error) {
              console.error("Gemini API Error:", error.message);
              chrome.notifications.create({
                type: 'basic',
                title: 'Gemini API Error',
                message: 'Failed to process text with Gemini API.',
              });
            }
            // Clear the saved text after sending to Gemini
            savedText = '';
          }, 5000); // 5-second delay
        }
      });
    } catch (e) {
      console.error(e);
      chrome.notifications.create({
        type: 'basic',
        title: 'Error',
        message: e.message
      });
      processingCount--; // Ensure counter is decremented on error
    }
  }
});

function getPromptText(command, azureResultText) {
  const prompts = {
    "run_ocr": "Solve this Java coding problem according to these specific requirements: \n1. Use the exact class name and method signatures provided \n2. Provide a complete, executable solution that meets all requirements \n3. Include test cases to validate your solution \n4. Respond with code only - no explanations or commentary \n 5. Ensure solution is optimized and properly handles all edge cases " ,
    "run_ocr1": "Select the correct answer for this multiple-choice aptitude question. Provide only the letter and answer (e.g., A. 42) without explanation. Use critical reasoning if information seems insufficient.",
    "run_ocr2": "Rank these options from most suitable (1) to least suitable (4) based on the values assessment question. Format your response as a numbered list with no additional text. ",
    "run_ocr3": "Provide a complete Java 7 solution that: \n 1. Uses the exact class name and method signatures specified \n 2. Solves the problem completely as described \n 3. Includes the test cases provided to validate your solution \n 4. Is compatible with Java compiler version 1.7 \n 5. Contains code only - no explanations or commentary \n First analyze the requirements and test cases thoroughly, then implement an optimized solution that handles all edge cases.", 
   };
  return `${prompts[command]} ${azureResultText}`;
}

// Helper function: Convert base64 image URL to ArrayBuffer
async function urlToArrayBuffer(dataUrl) {
  console.log('urlToArrayBuffer called with dataUrl:', dataUrl);

  try {
    console.log('Starting fetch for dataUrl:', dataUrl);
    const response = await fetch(dataUrl);
    console.log('Fetch response:', response);

    if (!response.ok) {
      console.error('Fetch failed with status:', response.status, response.statusText);
      throw new Error(`Fetch Error: ${response.status} - ${response.statusText}`);
    }

    console.log('Converting response to ArrayBuffer');
    const arrayBuffer = await response.arrayBuffer();
    console.log('ArrayBuffer created');

    return arrayBuffer;
  } catch (error) {
    console.error('Error in urlToArrayBuffer:', error);
    throw error;
  }
}

// Existing Azure Vision API code
async function analyzeImageAzure(imageBuffer) {
  console.log('analyzeImageAzure called');

  const endpoint = '<ENDPOINT>';
  const subscriptionKey = '<subscriptionKey>';
  const apiUrl = `${endpoint}/computervision/imageanalysis:analyze?features=caption,read&model-version=latest&language=en&api-version=2024-02-01`;

  console.log('API URL:', apiUrl);

  try {
    console.log('Sending POST request to Azure Vision API');
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': subscriptionKey,
        'Content-Type': 'application/octet-stream'
      },
      body: imageBuffer
    });

    console.log('Fetch response from API:', response);

    if (!response.ok) {
      console.error('API response failed with status:', response.status, response.statusText);
      return `Error: ${response.status} - ${response.statusText}`;
    }

    console.log('Parsing API response as JSON');
    const result = await response.json();
    console.log('API response JSON:', result);

    let displayText = '';

    if (result.readResult && result.readResult.lines) {
      console.log('Processing readResult.lines');
      result.readResult.lines.forEach(line => {
        displayText += line.text + '\n';
      });
    }

    console.log('Display text:', displayText);
    return displayText || 'No readable text found.';
  } catch (error) {
    console.error('Error in analyzeImageAzure:', error);
    return `Error: ${error.message}`;
  }
}

async function cropHalf(imageUrl, side) {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const imageBitmap = await createImageBitmap(blob);

    const leftWidth = Math.floor(imageBitmap.width * 0.45);
    const rightWidth = imageBitmap.width - leftWidth;

    let canvas, ctx;

    if (side === 'left') {
      canvas = new OffscreenCanvas(leftWidth, imageBitmap.height);
      ctx = canvas.getContext('2d');
      ctx.drawImage(imageBitmap, 0, 0, leftWidth, imageBitmap.height, 0, 0, canvas.width, canvas.height);
    } else if (side === 'right') {
      canvas = new OffscreenCanvas(rightWidth, imageBitmap.height);
      ctx = canvas.getContext('2d');
      ctx.drawImage(imageBitmap, leftWidth, 0, rightWidth, imageBitmap.height, 0, 0, canvas.width, canvas.height);
    }

    const croppedBlob = await canvas.convertToBlob({ type: 'image/png' });

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(croppedBlob);
    });
  } catch (error) {
    console.error(`Error cropping ${side} half of image:`, error);
    throw error;
  }
}
