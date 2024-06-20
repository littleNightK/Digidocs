//upload script
var dropZones = document.getElementsByClassName("drop-zone");
var fileInputs = document.getElementsByClassName("file");
var urlInputs = document.getElementsByClassName("url");
var uploadIcons = document.getElementsByClassName("upload-icon");
var fileNameElements = document.getElementsByClassName("file-name");

function setCameraBlockPointerEvents(enabled) {
  var cameraBlock = document.querySelector(".camera-block");
  if (cameraBlock) {
    cameraBlock.style.pointerEvents = enabled ? "auto" : "none";
  }
}

let isCameraActive = false;

function checkAndSetCameraActive() {
  var cameraBlock = document.querySelector(".camera-block");
  // Replace the condition below with your actual condition to check if the camera is active
  isCameraActive = cameraBlock && cameraBlock.style.pointerEvents === "none";
  return isCameraActive;
}

var cameraBlock = document.querySelector(".camera-block");
cameraBlock.addEventListener("click", function () {
  // Set isCameraActive to true when the camera block is clicked
  checkAndSetCameraActive();

  // Disable the file and URL inputs
  for (let i = 0; i < fileInputs.length; i++) {
    fileInputs[i].disabled = true;
    urlInputs[i].disabled = true;
  }
});

for (let i = 0; i < dropZones.length; i++) {
  let dropZone = dropZones[i];
  let fileInput = fileInputs[i];
  let urlInput = urlInputs[i];
  let uploadIcon = uploadIcons[i];
  let fileNameElement = fileNameElements[i];

  dropZone.addEventListener("click", function () {
    fileInput.click();
  });

  fileInput.addEventListener("change", function () {
    if (this.files && this.files.length > 0) {
      var file = this.files[0];
      var fileSize = file.size / 1024 / 1024; // in MB

      if (fileSize > 25) {
        alert("File size exceeds 25MB. Please select a smaller file.");
        this.value = ""; // Clear the input
        return;
      }

      fileNameElement.textContent = file.name;
      uploadIcon.style.display = "none";
      if (!isCameraActive) {
        urlInput.disabled = true;
      }
      setCameraBlockPointerEvents(false);
    } else {
      fileNameElement.textContent = "";
      uploadIcon.style.display = "";
      if (!isCameraActive) {
        urlInput.disabled = false;
      }
      setCameraBlockPointerEvents(true);
    }
  });

  urlInput.addEventListener("input", function () {
    if (this.value) {
      if (!isCameraActive) {
        fileInput.disabled = true;
      }
      setCameraBlockPointerEvents(false);
    } else {
      if (!isCameraActive) {
        fileInput.disabled = false;
      }
      setCameraBlockPointerEvents(true);
    }
  });

  dropZone.addEventListener("dragover", function (e) {
    e.preventDefault();
    this.style.background = "#f0f0f0";
  });

  dropZone.addEventListener("dragleave", function (e) {
    this.style.background = "none";
  });

  dropZone.addEventListener("drop", function (e) {
    e.preventDefault();
    this.style.background = "none";
    fileInput.files = e.dataTransfer.files;
    fileNameElement.textContent = e.dataTransfer.files[0].name;
    uploadIcon.style.display = "none";
    urlInput.disabled = true;
  });
}

window.addEventListener("DOMContentLoaded", (event) => {
  const fileInput = document.querySelector(".file");
  const removeFileButton = document.querySelector(".remove-file");
  const fileNameElement = document.querySelector(".file-name");
  const uploadIcon = document.querySelector(".upload-icon");
  const urlInput = document.querySelector(".url"); // Use '.url' as the selector

  fileInput.addEventListener("change", function () {
    if (this.files && this.files[0]) {
      fileNameElement.textContent = this.files[0].name;
      removeFileButton.style.display = "block";
      uploadIcon.style.display = "none";
      urlInput.disabled = true;
    } else {
      // If no file is selected, hide the removeFileButton
      removeFileButton.style.display = "none";
      uploadIcon.style.display = "block";
      urlInput.disabled = false;
      setCameraBlockPointerEvents(true);
    }
  });

  removeFileButton.addEventListener("click", function (event) {
    event.stopPropagation();
    fileInput.value = "";
    fileNameElement.textContent = "";
    this.style.display = "none";
    uploadIcon.style.display = "block";
    urlInput.disabled = false;
    setCameraBlockPointerEvents(true);
  });
});

function isVideoFeedActive() {
  const videoElement = document.getElementById("video-table");
  if (videoElement && videoElement.srcObject) {
    const tracks = videoElement.srcObject.getTracks();
    return tracks && tracks.some(track => track.readyState === 'live');
  }
  return false;
}


//Camera script
const videoElement = document.getElementById("video-table");
const boundingBoxCanvas = document.getElementById("boundingBoxCanvas");
const boundingBoxCtx = boundingBoxCanvas.getContext("2d");
const startCameraButton = document.querySelector(".start-camera");

async function initializeCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        height: { exact: 480 },
        width: { exact: 640 },
      },
    });
    videoElement.srcObject = stream;
    videoElement.onloadedmetadata = () => {
      videoElement.play();
      startDetectionLoop();
    };
    document.getElementById("videoContainer").style.display = "block";
  } catch (error) {
    console.error("Error accessing camera:", error);
  }
}

async function startDetectionLoop() {
  const videoElement = document.getElementById("video-table");
  const canvas = document.createElement("canvas");
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  const ctx = canvas.getContext("2d");

  const detectFrame = async () => {
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    const imageBlob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg")
    );
    const boxes = await detect_objects_on_image(imageBlob);
    draw_image_and_boxes(imageBlob, boxes);

    requestAnimationFrame(detectFrame); // Detect objects in the next frame
  };

  detectFrame(); // Start detecting objects in frames
}

async function captureContent() {
  const videoElement = document.getElementById("video-table");
  const canvas = document.createElement("canvas");
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  const ctx = canvas.getContext("2d");

  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

  const boxes = await detect_objects_on_image(
    await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg"))
  );

  boxes.forEach(([x1, y1, x2, y2]) => {
    const captureCanvas = document.createElement("canvas");
    captureCanvas.width = x2 - x1;
    captureCanvas.height = y2 - y1;
    const captureCtx = captureCanvas.getContext("2d");

    captureCtx.drawImage(
      canvas,
      x1,
      y1,
      x2 - x1,
      y2 - y1,
      0,
      0,
      x2 - x1,
      y2 - y1
    );

    deskewAndDisplayImage(captureCanvas, "preview-img");
  });
}

startCameraButton.addEventListener("click", () => {
  if (!isCameraActive) {
    initializeCamera();
    isCameraActive = true;
  } else {
    captureContent();
  }
});

async function deskewAndDisplayImage(captureCanvas, targetElementId) {
  cv['onRuntimeInitialized'] = async () => {
      // Convert canvas to OpenCV Mat
      let src = cv.imread(captureCanvas);
      let dst = new cv.Mat();
      let M = cv.Mat.eye(2, 3, cv.CV_32FC1);
      let dsize = new cv.Size(src.rows, src.cols);

      // Convert to grayscale
      cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);

      // Detect edges
      cv.Canny(src, src, 50, 200, 3);

      // Find lines
      let lines = new cv.Mat();
      cv.HoughLinesP(src, lines, 1, Math.PI / 180, 2, null, null, 30, 10);

      // Calculate the angle here based on the detected lines
      // This is a simplified approach and might need adjustment
      let angle = 0;
      for (let i = 0; i < lines.rows; ++i) {
          let startPoint = new cv.Point(lines.data32S[i * 4], lines.data32S[i * 4 + 1]);
          let endPoint = new cv.Point(lines.data32S[i * 4 + 2], lines.data32S[i * 4 + 3]);
          angle += Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);
      }
      angle /= lines.rows;
      angle = angle * (180 / Math.PI);

      // Rotate the image to deskew
      let center = new cv.Point(src.cols / 2, src.rows / 2);
      M = cv.getRotationMatrix2D(center, angle, 1);
      cv.warpAffine(src, dst, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

      // Convert the processed OpenCV image back to a Data URL
      cv.imshow('canvasOutput', dst); // 'canvasOutput' is an id of an invisible canvas element
      let canvas = document.getElementById('canvasOutput');
      let newDataURL = canvas.toDataURL('image/jpeg');

      // Display the deskewed image
      const imgElement = document.createElement("img");
      imgElement.src = newDataURL;
      imgElement.style.margin = "10px";
      document.getElementById(targetElementId).appendChild(imgElement);

      // Clean up
      src.delete(); dst.delete(); M.delete(); lines.delete();
  };
}

/**
 * Function draws the image from provided file
 * and bounding boxes of detected objects on
 * top of the image. It also captures and saves the image of the detected object.
 * @param file Uploaded file object
 * @param boxes Array of bounding boxes in format [[x1,y1,x2,y2,object_type,probability],...]
 */
function draw_image_and_boxes(file, boxes) {
  const boundingBoxCanvas = document.getElementById("boundingBoxCanvas");
  const boundingBoxCtx = boundingBoxCanvas.getContext("2d");

  // Clear the canvas before drawing new bounding boxes
  boundingBoxCtx.clearRect(
    0,
    0,
    boundingBoxCanvas.width,
    boundingBoxCanvas.height
  );

  boundingBoxCtx.strokeStyle = "#00FF00";
  boundingBoxCtx.lineWidth = 3;
  boundingBoxCtx.font = "18px serif";
  boxes.forEach(([x1, y1, x2, y2, label]) => {
    boundingBoxCtx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    boundingBoxCtx.fillStyle = "#00ff00";
    const width = boundingBoxCtx.measureText(label).width;
    boundingBoxCtx.fillRect(x1, y1, width + 10, 25);
    boundingBoxCtx.fillStyle = "#000000";
    boundingBoxCtx.fillText(label, x1, y1 + 18);
  });
}

/**
 * Function receives an image, passes it through YOLOv8 neural network
 * and returns an array of detected objects and their bounding boxes
 * @param buf Input image body
 * @returns Array of bounding boxes in format [[x1,y1,x2,y2,object_type,probability],..]
 */
async function detect_objects_on_image(buf) {
  const [input, img_width, img_height] = await prepare_input(buf);
  const output = await run_model(input);
  return process_output(output, img_width, img_height);
}

/**
 * Function used to convert input image to tensor,
 * required as an input to YOLOv8 object detection
 * network.
 * @param buf Content of uploaded file
 * @returns Array of pixels
 */
async function prepare_input(buf) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = URL.createObjectURL(buf);
    img.onload = () => {
      const [img_width, img_height] = [img.width, img.height];
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 640;
      const context = canvas.getContext("2d");
      context.drawImage(img, 0, 0, 640, 640);
      const imgData = context.getImageData(0, 0, 640, 640);
      const pixels = imgData.data;

      const red = [],
        green = [],
        blue = [];
      for (let index = 0; index < pixels.length; index += 4) {
        red.push(pixels[index] / 255.0);
        green.push(pixels[index + 1] / 255.0);
        blue.push(pixels[index + 2] / 255.0);
      }
      const input = [...red, ...green, ...blue];
      resolve([input, img_width, img_height]);
    };
  });
}

// Move the model loading outside of the run_model function
const modelPromise = ort.InferenceSession.create("models/yolov8n-layout.onnx");

/**
 * Function used to pass provided input tensor to YOLOv8 neural network and return result
 * @param input Input pixels array
 * @returns Raw output of neural network as a flat array of numbers
 */
async function run_model(input) {
  const model = await modelPromise; // Use the pre-loaded model
  input = new ort.Tensor(Float32Array.from(input), [1, 3, 640, 640]);
  const outputs = await model.run({ images: input });
  return outputs["output0"].data;
}

/**
 * Function used to convert RAW output from YOLOv8 to an array of detected objects.
 * Each object contain the bounding box of this object, the type of object and the probability
 * @param output Raw output of YOLOv8 network
 * @param img_width Width of original image
 * @param img_height Height of original image
 * @returns Array of detected objects in a format [[x1,y1,x2,y2,object_type,probability],..]
 */
function process_output(output, img_width, img_height) {
  let boxes = [];
  for (let index = 0; index < 8400; index++) {
    const [class_id, prob] = [...Array(11).keys()]
      .map((col) => [col, output[8400 * (col + 4) + index]])
      .reduce((accum, item) => (item[1] > accum[1] ? item : accum), [0, 0]);
    if (prob < 0.5) {
      continue;
    }
    if (class_id !== 8) {
      continue;
    }
    const label = yolo_classes[class_id];
    const xc = output[index];
    const yc = output[8400 + index];
    const w = output[2 * 8400 + index];
    const h = output[3 * 8400 + index];
    const x1 = ((xc - w / 2) / 640) * img_width;
    const y1 = ((yc - h / 2) / 640) * img_height;
    const x2 = ((xc + w / 2) / 640) * img_width;
    const y2 = ((yc + h / 2) / 640) * img_height;
    boxes.push([x1, y1, x2, y2, label, prob]);
  }

  boxes = boxes.sort((box1, box2) => box2[5] - box1[5]);
  const result = [];
  while (boxes.length > 0) {
    result.push(boxes[0]);
    boxes = boxes.filter((box) => iou(boxes[0], box) < 0.7);
  }
  return result;
}

/**
 * Function calculates "Intersection-over-union" coefficient for specified two boxes
 * https://pyimagesearch.com/2016/11/07/intersection-over-union-iou-for-object-detection/.
 * @param box1 First box in format: [x1,y1,x2,y2,object_class,probability]
 * @param box2 Second box in format: [x1,y1,x2,y2,object_class,probability]
 * @returns Intersection over union ratio as a float number
 */
function iou(box1, box2) {
  return intersection(box1, box2) / union(box1, box2);
}

/**
 * Function calculates union area of two boxes.
 *     :param box1: First box in format [x1,y1,x2,y2,object_class,probability]
 *     :param box2: Second box in format [x1,y1,x2,y2,object_class,probability]
 *     :return: Area of the boxes union as a float number
 * @param box1 First box in format [x1,y1,x2,y2,object_class,probability]
 * @param box2 Second box in format [x1,y1,x2,y2,object_class,probability]
 * @returns Area of the boxes union as a float number
 */
function union(box1, box2) {
  const [box1_x1, box1_y1, box1_x2, box1_y2] = box1;
  const [box2_x1, box2_y1, box2_x2, box2_y2] = box2;
  const box1_area = (box1_x2 - box1_x1) * (box1_y2 - box1_y1);
  const box2_area = (box2_x2 - box2_x1) * (box2_y2 - box2_y1);
  return box1_area + box2_area - intersection(box1, box2);
}

/**
 * Function calculates intersection area of two boxes
 * @param box1 First box in format [x1,y1,x2,y2,object_class,probability]
 * @param box2 Second box in format [x1,y1,x2,y2,object_class,probability]
 * @returns Area of intersection of the boxes as a float number
 */
function intersection(box1, box2) {
  const [box1_x1, box1_y1, box1_x2, box1_y2] = box1;
  const [box2_x1, box2_y1, box2_x2, box2_y2] = box2;
  const x1 = Math.max(box1_x1, box2_x1);
  const y1 = Math.max(box1_y1, box2_y1);
  const x2 = Math.min(box1_x2, box2_x2);
  const y2 = Math.min(box1_y2, box2_y2);
  return (x2 - x1) * (y2 - y1);
}

/**
 * Array of YOLOv8 class labels
 */
const yolo_classes = [
  "Caption",
  "Footnote",
  "Formula",
  "List-item",
  "Page-footer",
  "Page-header",
  "Picture",
  "Section-header",
  "Table",
  "Text",
  "Title",
];

document.getElementById("cancel").addEventListener("click", function () {
  location.reload();
});