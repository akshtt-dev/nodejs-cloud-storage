function showCreateFolder() {
  const createFolderBox = document.getElementById("create-folder-box");
  const folderName = document.getElementById("create-folder-input-name");
  folderName.style.border = "none";
  createFolderBox.classList.toggle("hidden");
  createFolderBox.classList.toggle("flex");
  previewOptionBox();
}

function createFolder() {
  const folderName = document.getElementById("create-folder-input-name");
  if (!folderName.value) {
    const random = Math.floor(Math.random() * 1000);
    folderName.value = "Folder-" + random;
    return;
  }
  fetch(`/file/create-folder/${folderName.value}`, {
    method: "get",
  }).then((res) => {
    if (res.ok) {
      location.reload();
    } else {
      folderName.style.border = "1px solid red";
    }
  });
}

function previewOptionBox() {
  const previewOptionBox = document.getElementById("preview-option-box");
  previewOptionBox.classList.toggle("hidden");
  previewOptionBox.classList.toggle("flex");
}

document.querySelectorAll(".context-button").forEach((button) => {
  button.addEventListener("contextmenu", function (event) {
    event.preventDefault();

    const filename = this.getAttribute("data-filename");
    const originalName = this.getAttribute("data-originalname");

    previewFolderOptions(filename, originalName);
  });
});

function previewOptions(filename, originalName) {
  const previewOptionsContainer = document.getElementById(
    "preview-options-container"
  );
  previewOptionsContainer.classList.remove("hidden");
  previewOptionsContainer.classList.add("flex");
  previewOptionsContainer.innerHTML = `<div
    class="relative bg-slate-900 p-6 rounded-lg shadow-2xl max-w-4xl overflow-hidden animate-fade-in flex flex-col gap-4 w-[90vw] sm:w-[50vw]">
    <button onclick="closePreviewOptions()">
    <a href="/file/download/${filename}" download="${originalName}"
    class="border border-slate-700 py-2 rounded-lg hover:bg-green-600 transition-colors text-center block w-full">
    <h1 class="text-slate-300 text-lg">Download</h1>
    </a>
    </button>
    <button onclick="deleteFile('${filename}')"
    class="border border-slate-700 py-2 rounded-lg hover:bg-red-600 transition-colors">
    <h1 class="text-slate-300 text-lg">Delete</h1>
    </button>
    <button onclick="closePreviewOptions()"
    class="border border-slate-700 py-2 rounded-lg hover:bg-slate-800 transition-colors">
    <h1 class="text-slate-300 text-lg">Close</h1>
    </button>
    </div>`;
}

function previewFolderOptions(filename, originalName) {
  const previewOptionsContainer = document.getElementById(
    "preview-options-container"
  );
  previewOptionsContainer.classList.remove("hidden");
  previewOptionsContainer.classList.add("flex");
  previewOptionsContainer.innerHTML = `<div
    class="relative bg-slate-900 p-6 rounded-lg shadow-2xl max-w-4xl overflow-hidden animate-fade-in flex flex-col gap-4 w-[90vw] sm:w-[50vw]">
    <button onclick="closePreviewOptions()">
    <a href="/file/download-folder/${filename}" download="${originalName}"
    class="border border-slate-700 py-2 rounded-lg hover:bg-green-600 transition-colors text-center block w-full">
    <h1 class="text-slate-300 text-lg">Download</h1>
    </a>
    </button>
    <button onclick="deleteFolder('${filename}')"
    class="border border-slate-700 py-2 rounded-lg hover:bg-red-600 transition-colors">
    <h1 class="text-slate-300 text-lg">Delete</h1>
    </button>
    <button onclick="closePreviewOptions()"
    class="border border-slate-700 py-2 rounded-lg hover:bg-slate-800 transition-colors">
    <h1 class="text-slate-300 text-lg">Close</h1>
    </button>
    </div>`;
}

function closePreviewOptions() {
  const previewOptionsContainer = document.getElementById(
    "preview-options-container"
  );
  previewOptionsContainer.classList.add("hidden");
}

function deleteFile(filename) {
  fetch(`/file/delete/${filename}`, {
    method: "get",
  }).then((res) => {
    if (res.ok) {
      location.reload();
    } else {
      alert("Failed to delete file");
    }
  });
}

function deleteFolder(filename) {
  fetch(`/file/delete-folder/${filename}`, {
    method: "get",
  }).then((res) => {
    if (res.ok) {
      location.reload();
    } else {
      alert("Failed to delete Folder");
    }
  });
}
function previewFile(filename) {
  const previewContainer = document.getElementById("preview-container");
  const previewImage = document.getElementById("preview-image");
  const previewVideo = document.getElementById("preview-video");
  const fileExtension = filename.split(".").pop().toLowerCase();
  const previewUrl = `/file/preview/${filename}`;

  if (["jpg", "jpeg", "png", "gif"].includes(fileExtension)) {
    previewImage.src = previewUrl;
    previewImage.style.display = "block";
    previewVideo.style.display = "none";
  } else if (["mp4", "webm", "ogg"].includes(fileExtension)) {
    previewVideo.src = previewUrl;
    previewVideo.style.display = "block";
    previewImage.style.display = "none";
  } else {
    alert("Preview not available for this file type");
    return;
  }

  previewContainer.classList.remove("hidden");
  previewContainer.classList.add("flex"); // Ensure the container is flex
}

function closePreview() {
  const previewContainer = document.getElementById("preview-container");
  previewContainer.classList.add("hidden");
  previewContainer.classList.remove("flex"); // Hide the flex container
}
