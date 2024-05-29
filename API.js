// Select the form
const form = document.querySelector(".Input-form");

// Add an event listener for the form submission
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  // Get the input elements
  const inputFile = document.querySelector('input[type="file"]');
  const inputUrl = document.querySelector('input[type="url"]');
  const previewImg = document.querySelector("#preview");

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
    } else {
      // If it's not the table page, handle the response as a .docx file
      link.download = "document.docx";
      link.textContent = `Download document.docx`;
    }

    outputContainer.innerHTML = ""; // Clear previous output
    outputContainer.appendChild(link);
  } else {
    console.error("Error:", response.statusText);
  }

  // // Check if the request was successful
  // if (response.ok) {
  //   // Parse the JSON response
  //   const result = await response.json();

  //   // Extract the file information
  //   const docxFilePath = result.file;
  //   const filename = result.filename;

  //   // Create a URL for the .docx document
  //   const url = URL.createObjectURL(
  //     new Blob([docxFilePath], {
  //       type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  //     })
  //   );

  //   // Output the .docx document to the api-output-container
  //   const outputContainer = document.querySelector("#api-output-container");
  //   const link = document.createElement("a");
  //   link.href = url;
  //   link.download = filename;
  //   link.textContent = `Download ${filename}`;
  //   outputContainer.innerHTML = ""; // Clear previous output
  //   outputContainer.appendChild(link);
  // } else {
  //   console.error("Error:", response.statusText);
  // }
});