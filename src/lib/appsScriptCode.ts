/**
 * Google Apps Script (Code.gs)
 * ENGINE PENYIMPANAN BERKAS & FOTO GOOGLE DRIVE
 * Digunakan khusus untuk mengunggah dan menyimpan file PDF, dokumen, dan foto ke Google Drive (DriveApp).
 * Seluruh data database (Users, Documents, AccessLogs, Categories, Departments, KPI, Appraisal)
 * disimpan dan diproses secara native di Firebase Firestore.
 */

export const GOOGLE_DRIVE_STORAGE_SCRIPT = `/**
 * =========================================================================
 * HOTEL CIPUTRA JAKARTA - GOOGLE DRIVE STORAGE & UPLOAD ENGINE
 * BACKEND: GOOGLE APPS SCRIPT (DRIVEAPP)
 * =========================================================================
 * Fungsi Utama:
 * 1. Menerima unggahan file dokumen (PDF, Word, Excel) & foto dari portal web
 * 2. Menyimpan otomatis ke folder Google Drive "Intranet_Ciputra_Uploads"
 * 3. Mengatur hak akses "Anyone with link (View Only)" agar berkas dapat diakses di portal
 * 4. Mengembalikan URL berkas, thumbnail, tautan pratinjau, dan tautan unduh langsung
 * 
 * *Catatan: Database utama menggunakan Firebase Firestore (tanpa spreadsheet).
 */

var DEFAULT_FOLDER_NAME = "Intranet_Ciputra_Uploads";

/**
 * Mendapatkan atau membuat folder penyimpanan di Google Drive
 */
function getOrCreateDriveFolder(folderName) {
  var targetName = folderName || DEFAULT_FOLDER_NAME;
  var folders = DriveApp.getFoldersByName(targetName);
  if (folders.hasNext()) {
    return folders.next();
  }
  var newFolder = DriveApp.createFolder(targetName);
  newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return newFolder;
}

/**
 * Handler GET (Ping & Status Check)
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "ping";
  var result = {};

  try {
    if (action === "ping") {
      var folder = getOrCreateDriveFolder();
      result = {
        success: true,
        message: "Google Drive Storage Engine Online & Siap Digunakan",
        folderName: folder.getName(),
        folderId: folder.getId(),
        timestamp: new Date().toISOString()
      };
    } else {
      result = { success: false, error: "Action tidak dikenali: " + action };
    }
  } catch (err) {
    result = { success: false, error: err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handler POST (Unggah Berkas ke Google Drive)
 */
function doPost(e) {
  var response = {};
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;

    if (action === "ping") {
      var folder = getOrCreateDriveFolder(data.folderName);
      response = {
        success: true,
        message: "Google Drive Storage Engine Online & Siap Menerima File",
        folderName: folder.getName(),
        folderId: folder.getId(),
        timestamp: new Date().toISOString()
      };
    } else if (action === "uploadFile") {
      response = handleUploadToDrive(data);
    } else if (action === "deleteFile") {
      response = handleDeleteFromDrive(data.driveFileId || data.fileId);
    } else {
      response = { success: false, error: "Aksi tidak didukung: " + action };
    }
  } catch (err) {
    response = { success: false, error: err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Memproses Base64 dan mengunggah ke Google Drive
 */
function handleUploadToDrive(data) {
  if (!data.fileBase64) {
    return { success: false, error: "Data berkas base64 tidak ditemukan." };
  }

  var folder = getOrCreateDriveFolder(data.folderName);
  var decodedBytes = Utilities.base64Decode(data.fileBase64);
  var fileName = data.fileName || ("Doc_" + new Date().getTime() + ".pdf");
  var mimeType = data.mimeType || "application/octet-stream";

  var blob = Utilities.newBlob(decodedBytes, mimeType, fileName);
  var file = folder.createFile(blob);

  // Set izin akses berkas agar bisa dipratinjau karyawan
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  var fileId = file.getId();
  var fileUrl = "https://drive.google.com/file/d/" + fileId + "/view?usp=sharing";
  var previewUrl = "https://drive.google.com/file/d/" + fileId + "/preview";
  var downloadUrl = "https://drive.google.com/uc?export=download&id=" + fileId;
  var thumbUrl = "https://drive.google.com/thumbnail?sz=w800&id=" + fileId;

  return {
    success: true,
    message: "Berkas berhasil diunggah ke Google Drive!",
    fileId: fileId,
    fileName: fileName,
    fileUrl: fileUrl,
    previewUrl: previewUrl,
    downloadUrl: downloadUrl,
    thumbUrl: thumbUrl,
    folderId: folder.getId(),
    folderName: folder.getName(),
    uploadedAt: new Date().toISOString()
  };
}

/**
 * Hapus file dari Google Drive
 */
function handleDeleteFromDrive(fileId) {
  if (!fileId) return { success: false, error: "ID file Google Drive kosong." };
  try {
    var file = DriveApp.getFileById(fileId);
    file.setTrashed(true);
    return { success: true, message: "File berhasil dipindahkan ke Sampah Google Drive." };
  } catch (e) {
    return { success: false, error: "Gagal menghapus file Drive: " + e.toString() };
  }
}
`;

export const APPS_SCRIPT_CODE = GOOGLE_DRIVE_STORAGE_SCRIPT;
export const GAS_APPS_SCRIPT_FULL_CODE = GOOGLE_DRIVE_STORAGE_SCRIPT;
