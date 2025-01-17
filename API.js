import { detect_objects_on_image } from "./tabledet.js";
import { setDesiredClassId } from './tabledet.js';


// Function to determine and set the desired class ID based on the current page
function assignClassIdByPage() {
  const currentPage = window.location.pathname.split('/').pop(); // Get the current page name

  if (currentPage === 'table.html') {
    setDesiredClassId([8]); // Class 8 for table.html
  } else if (currentPage === 'document.html' || currentPage === 'text.html') {
    setDesiredClassId([8, 9]); // Classes 8 and 9 for document.html and text.html
  }
}

// Call the function to assign the class ID when the page loads
document.addEventListener('DOMContentLoaded', assignClassIdByPage);

// Select the form
const form = document.querySelector(".Input-form");

async function handleDetection(source) {
  const boxes = await detect_objects_on_image(source);
  const tableOrTextDetected = check_for_table_or_text(boxes);

  if (!tableOrTextDetected) {
    alert("No table or text detected. Please upload an image with a table or text.");
    document.dispatchEvent(new CustomEvent("detectionFailed"));
    return false;
  }
  return true;
}

// Function to check if a table or text is detected in the image
function check_for_table_or_text(boxes) {
  return boxes.some(([, , , , label]) => label === "Table" || label === "Text");
}

// Add an event listener for the form submission
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  // Get the input elements
  const inputFile = document.querySelector('input[type="file"]');
  const inputUrl = document.querySelector('input[type="url"]');
  const previewImg = document.querySelector("#preview-img");

  let detectionPassed = true;

  if (inputFile.files.length > 0) {
    const file = inputFile.files[0];
    detectionPassed = await handleDetection(file);
  } else if (previewImg && previewImg.src) {
    const blob = await fetch(previewImg.src).then(r => r.blob());
    detectionPassed = await handleDetection(blob);
  }

  if (!detectionPassed) return;
  
  // Create a new FormData instance
  const formData = new FormData();

  // Get the current page's URL
  const currentPage = window.location.href;

  // Add the current page's URL to the FormData
  formData.append("currentPage", currentPage);

  // Check which input type has data
  let inputWithData;
  if (inputFile.files.length > 0) {
    formData.append(inputFile.name, inputFile.files[0]);
    inputWithData = inputFile;
  } else if (inputUrl.value) {
    formData.append(inputUrl.name, inputUrl.value);
    inputWithData = inputUrl;
  } else {
    let blob = await fetch(previewImg.src).then((r) => r.blob());
    formData.append("file", blob, "image.png");
    inputWithData = previewImg;
  }

  // Get the endpoint and method from the data-* attributes
  let endpoint = inputWithData.dataset.endpoint;
  const method = inputWithData.dataset.method;

  // If the inputWithData is the URL input, add the URL as a query parameter
  if (inputWithData === inputUrl) {
    endpoint += `?${inputUrl.name}=${encodeURIComponent(inputUrl.value)}`;
  }

// Send the request to the backend API
let response;
try {
  if (inputWithData === inputUrl && method === "GET") {
    // If the inputWithData is the URL input and method is GET, send the request without a body
    response = await fetch(endpoint);
  } else {
    // If the inputWithData is the file or camera input, send the form data in the body
    response = await fetch(endpoint, {
      method: method,
      body: formData,
    });
  }

  // Check if the request was successful
  if (response.ok) {
    // Handle the response as a Blob
    const blob = await response.blob();

    // Create a URL for the .docx document
    const url = URL.createObjectURL(blob);

    // Output the .docx document or .zip file to the api-output-container
    const outputContainer = document.querySelector("#api-output-container");
    const link = document.createElement("a");
    link.href = url;

    // Check if the current page is the table page
    if (currentPage.includes("table")) {
      // If it's the table page, handle the response as a .zip file
      link.download = "document.zip";
      link.textContent = `Download document.zip`;
      await previewXLSXFiles(blob);
    } else {
      // If it's not the table page, handle the response as a .docx file
      link.download = "document.docx";
      link.textContent = `Download document.docx`;
      await previewDOCXFiles(blob);
    }

    outputContainer.innerHTML = ""; // Clear previous output
    outputContainer.appendChild(link);
  } else {
    // The request was not successful, parse the error message from the response
    const errorData = await response.json(); // Parse the JSON response to get the error details
    const errorMessage = errorData.detail || "An unknown error occurred"; // Use the 'detail' field for the error message
    alert(`Error: ${errorMessage}`);
    window.location.reload();
  }
} catch (error) {
  // Handle network errors or other fetch issues
  console.error("Network error:", error);
  alert("A network error occurred. Please try again.");
  window.location.reload();
}
});

async function previewXLSXFiles(blob) {
  const zip = await JSZip.loadAsync(blob);
  const previewBox = document.getElementById("xlsx-preview-box");
  // Clear existing previews
  previewBox.innerHTML = "";
  zip.forEach(async (relativePath, file) => {
    if (relativePath.endsWith(".xlsx")) {
      const arrayBuffer = await file.async("arraybuffer");
      const workbook = XLSX.read(arrayBuffer, { type: "buffer" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Convert the worksheet to JSON, slice to the first 6 rows, and convert back to a worksheet
      const rows = XLSX.utils
        .sheet_to_json(worksheet, { header: 1 })
      const newWorksheet = XLSX.utils.aoa_to_sheet(rows);
      const htmlStr = XLSX.utils.sheet_to_html(newWorksheet);

      // Create an iframe for the preview content
      const iframe = document.createElement("iframe");
      iframe.style.width = "100%";
      iframe.style.height = "400px"; // Adjust height as needed
      iframe.srcdoc = htmlStr;

      // Append the iframe to the preview box
      previewBox.appendChild(iframe);
    }
  });
}

async function previewDOCXFiles(docxBlob) {
  try {
    // Convert the DOCX Blob to an ArrayBuffer for mammoth.js
    const arrayBuffer = await docxBlob.arrayBuffer();

    // Use mammoth.js to convert the DOCX ArrayBuffer to HTML
    const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });

    // Create an iframe for the preview content
    const iframe = document.createElement("iframe");
    iframe.style.width = "100%";
    iframe.style.height = "400px"; // Adjust height as needed
    iframe.srcdoc = `<div style="color: black;">${result.value}</div>`;

    // Display the iframe in your preview container
    const previewBox = document.getElementById("docx-preview-box");
    previewBox.innerHTML = ""; // Clear existing previews
    previewBox.appendChild(iframe);
  } catch (error) {
    console.error("Error processing DOCX file:", error);
  }
}